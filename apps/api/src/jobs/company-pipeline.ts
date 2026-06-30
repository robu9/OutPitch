import { Queue, Worker, type Job } from "bullmq";
import { prisma, type CompanyContact } from "@outpitch/db";
import type { CompanySearchParams } from "@outpitch/types";
import { config } from "../config.js";
import { searchCompanies, searchPeopleAtCompany } from "../services/serp.js";
import { crawlCompanyWebsite } from "../services/crawler.js";
import { resolveEmail } from "../services/email-resolver.js";
import {
  ingestCompanyContext,
  companyDataset,
  userDataset,
  remember,
} from "../services/cognee.js";

const connection = { url: config.redisUrl };

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
    await updateJob(jobId, { status: "searching", progress: 10, message: "Searching companies..." });

    const companies = await searchCompanies(params);
    const results = [];

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
        crawledEmails = dbCompany.contacts
          .map((c: CompanyContact) => c.email)
          .filter((e: string | null | undefined): e is string => !!e);
      }

      await updateJob(jobId, {
        status: "enriching",
        progress: progress + 5,
        message: `Finding contacts at ${company.name}...`,
      });

      const people = await searchPeopleAtCompany(company.domain);
      const contacts = [];

      for (const person of people.slice(0, 5)) {
        const existing = dbCompany.contacts.find(
          (c: CompanyContact) => c.name.toLowerCase() === person.name.toLowerCase()
        );
        if (existing?.email) {
          contacts.push({
            name: existing.name,
            title: existing.title ?? person.title,
            email: existing.email,
            source: existing.source,
            confidence: existing.confidence,
          });
          continue;
        }

        const resolved = await resolveEmail({
          name: person.name,
          domain: company.domain,
          crawledEmails,
          title: person.title,
          linkedinUrl: person.linkedinUrl,
        });

        if (resolved) {
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
                title: person.title,
                email: resolved.email,
                linkedinUrl: person.linkedinUrl,
                source: resolved.source,
                confidence: resolved.confidence,
              },
            });
          }

          contacts.push({
            name: person.name,
            title: person.title,
            email: resolved.email,
            source: resolved.source,
            confidence: resolved.confidence,
          });
        }
      }

      await prisma.userCompanyLink.upsert({
        where: { userId_companyId: { userId, companyId: dbCompany.id } },
        create: { userId, companyId: dbCompany.id, matchScore: 70 + Math.floor(Math.random() * 20) },
        update: {},
      });

      results.push({
        id: dbCompany.id,
        name: company.name,
        domain: company.domain,
        description: company.description,
        matchScore: 70 + Math.floor(Math.random() * 20),
        contacts,
        sourceUrl: company.sourceUrl,
      });
    }

    await remember(
      `Job search for ${params.role}: found ${results.length} companies - ${results.map((r) => r.name).join(", ")}`,
      { dataset: userDataset(clerkId), token: cogneeToken }
    );

    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      message: `Found ${results.length} companies`,
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
