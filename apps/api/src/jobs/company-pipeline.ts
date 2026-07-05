import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { prisma, type CompanyContact } from "@outpitch/db";
import type { CompanySearchParams } from "@outpitch/types";
import { searchCompanies, searchPeopleAtCompany } from "../services/serp.js";
import { crawlCompanyWebsite } from "../services/crawler.js";
import { resolveEmail } from "../services/email-resolver.js";
import {
  ingestCompanyContext,
  companyDataset,
  userDataset,
  remember,
} from "../services/cognee.js";
import {
  buildUserMatchContext,
  isRecruitmentOrJobBoard,
  scoreCompanyAgainstUser,
  MIN_MATCH_SCORE,
} from "../services/company-matcher.js";
import { getQueueConnection } from "../lib/redis.js";
import { sendWhatsAppMessage } from "../services/whatsapp.js";

// Cast: the repo resolves two ioredis versions, so the ioredis instance and
// BullMQ's bundled ioredis type don't line up structurally. BullMQ accepts the
// instance fine at runtime.
const connection = getQueueConnection() as unknown as ConnectionOptions;

export const companyPipelineQueue = new Queue("company-pipeline", { connection });

interface PipelineJobData {
  jobId: string;
  userId: string;
  clerkId: string;
  params: CompanySearchParams;
  cogneeToken?: string;
  // If set, the search was started from WhatsApp — push results to this number on completion.
  whatsappNumber?: string;
}

async function updateJob(
  jobId: string,
  update: { status?: string; progress?: number; message?: string; result?: unknown; error?: string }
) {
  await prisma.pipelineJob.update({
    where: { id: jobId },
    // `result` is a Prisma Json column; the loose `unknown` here is a valid JSON value.
    data: update as Parameters<typeof prisma.pipelineJob.update>[0]["data"],
  });
}

export async function enqueueCompanyPipeline(
  userId: string,
  clerkId: string,
  params: CompanySearchParams,
  cogneeToken?: string,
  whatsappNumber?: string
) {
  const job = await prisma.pipelineJob.create({
    data: {
      userId,
      status: "queued",
      progress: 0,
      params: params as object,
    },
  });

  await companyPipelineQueue.add("discover", {
    jobId: job.id,
    userId,
    clerkId,
    params,
    cogneeToken,
    whatsappNumber,
  });

  return job;
}

// Bounded-concurrency map: runs `fn` over `items` with at most `limit` in flight.
// No external dependency; preserves input order in the returned array.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const COMPANY_CONCURRENCY = 3;
const MAX_PEOPLE_PER_COMPANY = 3;

function formatWhatsAppResults(role: string, results: Array<{ name: string; domain: string; matchScore: number; contacts: Array<{ name: string; title?: string; email: string }> }>): string {
  if (results.length === 0) {
    return `No strong matches for "${role}" yet. Try broadening the role or location and search again.`;
  }
  const lines = results.slice(0, 5).map((c, i) => {
    const header = `${i + 1}. ${c.name} (${c.domain}) — ${c.matchScore}% match`;
    const contact = c.contacts[0];
    const contactLine = contact
      ? `\n   ${contact.name}${contact.title ? `, ${contact.title}` : ""}${contact.email ? ` — ${contact.email}` : ""}`
      : "";
    return header + contactLine;
  });
  return (
    `Found ${results.length} companies for "${role}":\n\n${lines.join("\n\n")}\n\n` +
    `Want me to draft outreach emails for the top matches? Reply yes to continue.`
  );
}

async function processPipeline(job: Job<PipelineJobData>) {
  const { jobId, userId, clerkId, params, cogneeToken, whatsappNumber } = job.data;

  try {
    await updateJob(jobId, {
      status: "searching",
      progress: 5,
      message: "Loading your preferences from memory...",
    });

    const userContext = await buildUserMatchContext(userId, clerkId, cogneeToken);

    await updateJob(jobId, { status: "searching", progress: 10, message: "Searching employers..." });

    const rawCompanies = await searchCompanies(params);
    const companies = rawCompanies.filter((c) => !isRecruitmentOrJobBoard(c));

    if (companies.length === 0) {
      await updateJob(jobId, {
        status: "completed",
        progress: 100,
        message: "No matching employers found — try broadening role or location",
        result: [],
      });
      return [];
    }

    const scoredResults: Array<{
      id: string;
      name: string;
      domain: string;
      description?: string;
      matchScore: number;
      matchReason: string;
      contacts: Array<{
        name: string;
        title?: string;
        email: string;
        source: string;
        confidence: number;
      }>;
      sourceUrl: string;
    }> = [];

    let completed = 0;
    type ScoredCompany = (typeof scoredResults)[number];

    const processCompany = async (
      company: (typeof companies)[number]
    ): Promise<ScoredCompany | null> => {
      const progress = 10 + Math.floor((completed / companies.length) * 80);
      await updateJob(jobId, {
        status: "crawling",
        progress,
        message: `Processing ${company.name}...`,
      });

      // Upsert on the unique domain so two concurrent jobs (worker concurrency > 1)
      // discovering the same company don't both create it and hit a P2002 that
      // fails the whole job.
      let dbCompany = await prisma.company.upsert({
        where: { domain: company.domain },
        create: {
          name: company.name,
          domain: company.domain,
          description: company.description,
          sourceUrl: company.sourceUrl,
          cogneeDataset: `company_pending`,
        },
        update: {},
        include: { contacts: true },
      });

      if (dbCompany.cogneeDataset === "company_pending") {
        dbCompany = await prisma.company.update({
          where: { id: dbCompany.id },
          data: { cogneeDataset: companyDataset(dbCompany.id) },
          include: { contacts: true },
        });
      }

      let crawlSummary = "";
      let crawledEmails: string[] = [];

      if (!dbCompany.crawledAt) {
        const crawl = await crawlCompanyWebsite(company.domain);
        crawlSummary = crawl.summary;
        crawledEmails = crawl.allEmails;

        await ingestCompanyContext(
          dbCompany.id,
          `Company: ${company.name} (${company.domain})\n${crawl.summary}\nEmails found: ${crawl.allEmails.join(", ")}`,
          cogneeToken
        );

        await prisma.company.update({
          where: { id: dbCompany.id },
          data: { crawledAt: new Date(), description: company.description ?? crawlSummary.slice(0, 500) },
        });
      } else {
        crawlSummary = dbCompany.description ?? "";
        crawledEmails = dbCompany.contacts
          .map((c: CompanyContact) => c.email)
          .filter((e: string | null | undefined): e is string => !!e);
      }

      const people = await searchPeopleAtCompany(company.domain);
      const contacts: Array<{
        name: string;
        title?: string;
        email: string;
        source: string;
        confidence: number;
      }> = [];

      type PersonCandidate = {
        person: (typeof people)[number];
        existing?: CompanyContact;
        resolved: { email: string; source: string; confidence: number; title?: string };
      };

      // Resolve emails for the top people in parallel (pure, no DB writes).
      const resolvedCandidates = await Promise.all(
        people.slice(0, MAX_PEOPLE_PER_COMPANY).map(async (person): Promise<PersonCandidate | null> => {
          const existing = dbCompany.contacts.find(
            (c: CompanyContact) => c.name.toLowerCase() === person.name.toLowerCase()
          );

          const resolved = existing?.email
            ? {
                email: existing.email,
                source: existing.source,
                confidence: existing.confidence,
              }
            : await resolveEmail({
                name: person.name,
                domain: company.domain,
                crawledEmails,
                title: person.title,
                linkedinUrl: person.linkedinUrl,
              });

          return resolved ? { person, existing, resolved } : null;
        })
      );
      const candidates: PersonCandidate[] = resolvedCandidates.filter(
        (c): c is PersonCandidate => c !== null
      );

      await updateJob(jobId, {
        status: "enriching",
        progress: progress + 3,
        message: `Resolving contacts at ${company.name}...`,
      });

      for (const { person, existing, resolved } of candidates) {
        contacts.push({
          name: person.name,
          title: person.title ?? resolved.title,
          email: resolved.email,
          source: resolved.source,
          confidence: resolved.confidence,
        });

        if (existing) {
          await prisma.companyContact.update({
            where: { id: existing.id },
            data: {
              email: resolved.email,
              source: resolved.source,
              confidence: resolved.confidence,
            },
          });
        } else {
          await prisma.companyContact.create({
            data: {
              companyId: dbCompany.id,
              name: person.name,
              title: person.title ?? resolved.title,
              email: resolved.email,
              linkedinUrl: person.linkedinUrl,
              source: resolved.source,
              confidence: resolved.confidence,
            },
          });
        }
      }

      const preCheck = isRecruitmentOrJobBoard({
        ...company,
        description: `${company.description} ${crawlSummary}`.trim(),
      });
      if (preCheck) {
        console.log(`[pipeline] Skipping ${company.name} (${company.domain}): recruitment/job board`);
        completed++;
        return null;
      }

      const companyContext = crawlSummary || company.description || "";
      const { score: matchScore, reason: matchReason } = await scoreCompanyAgainstUser(
        userContext,
        company,
        companyContext,
        params.role
      );

      if (matchScore < MIN_MATCH_SCORE) {
        console.log(
          `[pipeline] Skipping ${company.name} (${company.domain}): score ${matchScore} — ${matchReason}`
        );
        completed++;
        return null;
      }

      await prisma.userCompanyLink.upsert({
        where: { userId_companyId: { userId, companyId: dbCompany.id } },
        create: { userId, companyId: dbCompany.id, matchScore },
        update: { matchScore },
      });

      completed++;
      return {
        id: dbCompany.id,
        name: company.name,
        domain: company.domain,
        description: company.description,
        matchScore,
        matchReason,
        contacts,
        sourceUrl: company.sourceUrl,
      };
    };

    // Process companies concurrently — different domains are fully independent.
    const mapped = await mapWithConcurrency(companies, COMPANY_CONCURRENCY, processCompany);
    for (const r of mapped) {
      if (r) scoredResults.push(r);
    }

    const results = scoredResults
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, params.limit);

    await remember(
      `Job search for ${params.role}: matched ${results.length} companies from memory — ${results.map((r) => `${r.name} (${r.matchScore}%)`).join(", ")}`,
      { dataset: userDataset(clerkId), token: cogneeToken }
    );

    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      message:
        results.length > 0
          ? `Found ${results.length} companies matched to your profile. Want me to draft outreach emails for the top matches?`
          : "No strong matches — try updating your preferences in chat",
      result: results,
    });

    // If the search was started from WhatsApp, push the results back to that number.
    if (whatsappNumber) {
      await sendWhatsAppMessage(whatsappNumber, formatWhatsAppResults(params.role, results)).catch(
        (err) => console.warn("WhatsApp results push failed:", err)
      );
    }

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    await updateJob(jobId, { status: "failed", error: message });
    if (whatsappNumber) {
      await sendWhatsAppMessage(
        whatsappNumber,
        `Sorry, the company search for "${params.role}" failed. Please try again.`
      ).catch(() => {});
    }
    throw error;
  }
}

let worker: Worker | null = null;

export function startPipelineWorker() {
  if (worker) return worker;

  worker = new Worker<PipelineJobData>("company-pipeline", processPipeline, {
    connection,
    concurrency: 2,
  });

  worker.on("failed", (job, err) => {
    console.error(`Pipeline job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function getPipelineStatus(jobId: string, userId: string) {
  const job = await prisma.pipelineJob.findFirst({
    where: { id: jobId, userId },
  });
  if (!job) return null;
  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    companies: job.result,
    error: job.error,
  };
}
