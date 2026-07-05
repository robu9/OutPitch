import { Queue, Worker, type Job } from "bullmq";
import { prisma, type CompanyContact } from "@outpitch/db";
import type { CompanySearchParams } from "@outpitch/types";
import { searchCompanies, searchPeopleAtCompany } from "../services/serp.js";
import { crawlCompanyWebsite } from "../services/crawler.js";
import {
  resolveEmail,
  resolveEmailViaApollo,
  isApolloEnrichmentAvailable,
  getApolloEnrichmentStatus,
} from "../services/email-resolver.js";
import { verifyEmailExists } from "../services/email-verifier.js";
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

const connection = getQueueConnection();

export const companyPipelineQueue = new Queue("company-pipeline", { connection });

interface PipelineJobData {
  jobId: string;
  userId: string;
  clerkId: string;
  params: CompanySearchParams;
  cogneeToken?: string;
}

async function updateJob(
  jobId: string,
  update: { status?: string; progress?: number; message?: string; result?: unknown; error?: string }
) {
  await prisma.pipelineJob.update({
    where: { id: jobId },
    data: update,
  });
}

export async function enqueueCompanyPipeline(
  userId: string,
  clerkId: string,
  params: CompanySearchParams,
  cogneeToken?: string
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
  });

  return job;
}

async function processPipeline(job: Job<PipelineJobData>) {
  const { jobId, userId, clerkId, params, cogneeToken } = job.data;

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

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const progress = 10 + Math.floor((i / companies.length) * 80);
      await updateJob(jobId, {
        status: "crawling",
        progress,
        message: `Processing ${company.name}...`,
      });

      let dbCompany = await prisma.company.findUnique({
        where: { domain: company.domain },
        include: { contacts: true },
      });

      if (!dbCompany) {
        dbCompany = await prisma.company.create({
          data: {
            name: company.name,
            domain: company.domain,
            description: company.description,
            sourceUrl: company.sourceUrl,
            cogneeDataset: `company_pending`,
          },
          include: { contacts: true },
        });

        await prisma.company.update({
          where: { id: dbCompany.id },
          data: { cogneeDataset: companyDataset(dbCompany.id) },
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

      const candidates: PersonCandidate[] = [];

      for (const person of people.slice(0, 5)) {
        const existing = dbCompany.contacts.find(
          (c: CompanyContact) => c.name.toLowerCase() === person.name.toLowerCase()
        );

        let resolved =
          existing?.email
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

        if (resolved) {
          candidates.push({ person, existing, resolved });
        }
      }

      await updateJob(jobId, {
        status: "enriching",
        progress: progress + 3,
        message: `Verifying emails at ${company.name}...`,
      });

      for (const { person, existing, resolved } of candidates) {
        const verification = await verifyEmailExists(resolved.email);
        if (verification.valid) {
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
        } else {
          console.log(
            `Rejected email ${resolved.email} for ${person.name} at ${company.domain}: ${verification.reason}`
          );
        }
      }

      if (contacts.length === 0) {
        const apolloAvailable = await isApolloEnrichmentAvailable();

        if (!apolloAvailable) {
          const apolloStatus = getApolloEnrichmentStatus();
          console.warn(
            `Skipping Apollo for ${company.name}: ${apolloStatus.reason ?? "enrichment unavailable"}`
          );
          await updateJob(jobId, {
            status: "enriching",
            progress: progress + 5,
            message: `No verified emails for ${company.name} (Apollo enrichment unavailable — upgrade Apollo plan)`,
          });
        } else {
          await updateJob(jobId, {
            status: "enriching",
            progress: progress + 5,
            message: `No verified emails — trying Apollo for ${company.name}...`,
          });

          for (const person of people.slice(0, 5)) {
            const apolloResolved = await resolveEmailViaApollo({
              name: person.name,
              domain: company.domain,
              linkedinUrl: person.linkedinUrl,
            });
            if (!apolloResolved) continue;

            const verification = await verifyEmailExists(apolloResolved.email);
            if (!verification.valid) {
              console.log(
                `Rejected Apollo email ${apolloResolved.email} for ${person.name} at ${company.domain}: ${verification.reason}`
              );
              continue;
            }

            const existing = dbCompany.contacts.find(
              (c: CompanyContact) => c.name.toLowerCase() === person.name.toLowerCase()
            );

            if (existing) {
              await prisma.companyContact.update({
                where: { id: existing.id },
                data: {
                  email: apolloResolved.email,
                  source: apolloResolved.source,
                  confidence: apolloResolved.confidence,
                  title: apolloResolved.title ?? person.title,
                },
              });
            } else {
              await prisma.companyContact.create({
                data: {
                  companyId: dbCompany.id,
                  name: person.name,
                  title: apolloResolved.title ?? person.title,
                  email: apolloResolved.email,
                  linkedinUrl: person.linkedinUrl,
                  source: apolloResolved.source,
                  confidence: apolloResolved.confidence,
                },
              });
            }

            contacts.push({
              name: person.name,
              title: apolloResolved.title ?? person.title,
              email: apolloResolved.email,
              source: apolloResolved.source,
              confidence: apolloResolved.confidence,
            });
          }
        }
      }

      const preCheck = isRecruitmentOrJobBoard({
        ...company,
        description: `${company.description} ${crawlSummary}`.trim(),
      });
      if (preCheck) {
        console.log(`[pipeline] Skipping ${company.name} (${company.domain}): recruitment/job board`);
        continue;
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
        continue;
      }

      await prisma.userCompanyLink.upsert({
        where: { userId_companyId: { userId, companyId: dbCompany.id } },
        create: { userId, companyId: dbCompany.id, matchScore },
        update: { matchScore },
      });

      scoredResults.push({
        id: dbCompany.id,
        name: company.name,
        domain: company.domain,
        description: company.description,
        matchScore,
        matchReason,
        contacts,
        sourceUrl: company.sourceUrl,
      });
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
          ? `Found ${results.length} companies matched to your profile`
          : "No strong matches — try updating your preferences in chat",
      result: results,
    });

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    await updateJob(jobId, { status: "failed", error: message });
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
