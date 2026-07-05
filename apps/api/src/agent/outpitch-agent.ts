import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  SchemaType,
} from "@google/generative-ai";
import { config } from "../config.js";
import { prisma, type Prisma } from "@outpitch/db";
import type { CompanySearchParams } from "@outpitch/types";
import {
  remember,
  improve,
  forget,
  userDataset,
  recallUserAndCompany,
} from "../services/cognee.js";
import { sendEmail, fetchEmails, getLinkedInProfileWithRetry } from "../services/composio.js";
import { buildLinkedInProfileSummary } from "../services/linkedin-profile.js";
import { enqueueCompanyPipeline, getPipelineStatus } from "../jobs/company-pipeline.js";
import { ingestUserProfile } from "../services/cognee.js";
import { assessSearchReadiness, toSearchParams } from "../services/search-context.js";
import {
  buildSenderProfileSummary,
  draftOutreachEmail,
} from "../services/email-drafter.js";

const SYSTEM_PROMPT = `You are Outpitch, an AI job search assistant. You help users find companies, discover founder and recruiter contacts, draft personalized outreach emails, and track their job search progress.

You receive the user's LinkedIn profile snapshot on every message (from Composio). For everything else, use Cognee memory tools dynamically — do not guess what is stored.

Cognee memory tools (call only when needed):
- recall(query): Search permanent memory for relevant facts before answering questions about preferences, past searches, outreach, or anything not in the profile snapshot
- remember(content): Persist a new fact the user shared (goals, preferences, constraints, decisions) — not routine chat filler
- improve(feedback): When the user corrects you or gives match quality feedback, refine future retrieval
- forget(topic): When the user asks to remove or stop using a stored topic

Response style (important):
- Keep replies short and conversational — a couple of sentences, not an essay.
- On a greeting or vague opener ("hi", "what can you do"), reply in 1-2 sentences and ask ONE focused question to move forward (e.g. "What role are you targeting?"). Never respond with a bulleted list of your capabilities.
- Surface at most one clear next action per reply rather than listing every feature.

Company discovery (critical — follow every time):
- When the user asks to search, find, or discover companies (or search/find "more" companies), you MUST call the searchCompanies tool to run a live search. Do NOT simply list previously matched companies found via recall from memory.
- NEVER call searchCompanies on the first vague request. Gather context first with short questions, one at a time.
- Before searchCompanies, call recall to check stored preferences. Use the profile snapshot too.
- Required before search: target role, location or remote preference, industry or company type, and at least basic company preferences (startup vs enterprise, must-haves, or deal-breakers).
- When the user answers a discovery question, call remember() with their answer, then ask the next missing piece OR search if context is complete.
- If searchCompanies returns blocked: true, ask nextQuestion exactly — do not retry search until the user replies.
- Only start search when the user confirms or you have all required context from profile + memory + their answers.
- Summarize what you understood in one sentence before starting the search.
- Write plain text ONLY. Never use markdown: no asterisks (* or **), no #, no bullet points, no bold/italic markers. This output is shown in web chat and WhatsApp, where markdown renders as broken characters.

Post-search outreach (critical):
- After searchCompanies starts, tell the user results are loading in the background.
- When search results are ready (user sees companies or says yes to outreach), ask exactly once: "Want me to draft outreach emails for the top matches?"
- Do not draft or send emails until the user explicitly says yes.
- If they say yes, call getSearchResults (with the jobId if you have it), then draftEmail for the best contact at each top company (up to 3). Show each draft and confirm before sendEmail.

Guidelines:
- If the user asks about stored context and the profile snapshot is insufficient, call recall first
- Never claim you lack LinkedIn profile data when it is present in context
- LinkedIn posts/activity are not ingested — only basic profile fields. Say so honestly if asked about posts
- Be proactive about suggesting companies and contacts
- For outreach, call draftEmail to generate the email body (Gemini writes it). Show the draft and ask for confirmation before sendEmail.
- Never send emails without explicit user confirmation`;

/**
 * Strip markdown formatting the model may still emit, so users never see raw
 * asterisks/bullets. Runs on the agent's final text before it reaches web chat or WhatsApp.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/__(.+?)__/g, "$1") // __bold__
    .replace(/\*(.+?)\*/g, "$1") // *italic*
    .replace(/_(.+?)_/g, "$1") // _italic_
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // # headings
    .replace(/^\s*[*\-+]\s+/gm, "") // bullet markers
    .replace(/`([^`]+)`/g, "$1"); // `code`
}

function buildProfileContext(
  user: { name: string | null; email?: string | null; linkedinConnected: boolean } | null,
  profile: {
    headline?: string | null;
    summary?: string | null;
    targetRole?: string | null;
    targetLocation?: string | null;
    targetIndustries?: string[];
    skills?: string[];
    linkedinData?: unknown;
  } | null | undefined
): string {
  if (!user && !profile) return "";

  const parts: string[] = [];
  if (user?.name) parts.push(`Name: ${user.name}`);
  if (user?.email) parts.push(`Email: ${user.email}`);
  if (user?.linkedinConnected) parts.push("LinkedIn: connected");
  if (profile?.headline) parts.push(`Headline: ${profile.headline}`);
  if (profile?.targetRole) parts.push(`Target role: ${profile.targetRole}`);
  if (profile?.targetLocation) parts.push(`Target location: ${profile.targetLocation}`);
  if (profile?.targetIndustries?.length) {
    parts.push(`Target industries: ${profile.targetIndustries.join(", ")}`);
  }
  if (profile?.skills?.length) parts.push(`Skills: ${profile.skills.join(", ")}`);
  if (profile?.summary) parts.push(`Summary: ${profile.summary}`);
  if (profile?.linkedinData) {
    parts.push(`LinkedIn profile: ${buildLinkedInProfileSummary(profile.linkedinData as Record<string, unknown>)}`);
  }

  return parts.length > 0 ? `[User profile: ${parts.join(" | ")}]\n\n` : "";
}

const tools: FunctionDeclaration[] = [
  {
    name: "searchCompanies",
    description:
      "Start company discovery after gathering context (role, location, industry, preferences). Blocked automatically if context is incomplete — ask the returned nextQuestion first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: { type: SchemaType.STRING, description: "Target job role" },
        location: { type: SchemaType.STRING, description: "Preferred location or remote" },
        industry: { type: SchemaType.STRING, description: "Industry or sector" },
        companySize: { type: SchemaType.STRING, description: "e.g. startup, Series B, enterprise" },
        keywords: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Extra search signals from user preferences",
        },
        limit: { type: SchemaType.NUMBER, description: "Max companies (1-20)" },
      },
      required: ["role"],
    },
  },
  {
    name: "getSearchResults",
    description:
      "Get results from a completed company search. Use when the user wants to review matches or proceed with outreach after search.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        jobId: { type: SchemaType.STRING, description: "Pipeline job ID from searchCompanies" },
      },
    },
  },
  {
    name: "getCompanyDetails",
    description: "Get details about a discovered company including contacts",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        companyId: { type: SchemaType.STRING },
      },
      required: ["companyId"],
    },
  },
  {
    name: "draftEmail",
    description: "Draft a personalized outreach email",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contactName: { type: SchemaType.STRING },
        contactTitle: { type: SchemaType.STRING },
        companyName: { type: SchemaType.STRING },
        companyId: { type: SchemaType.STRING },
        purpose: { type: SchemaType.STRING },
      },
      required: ["contactName", "companyName", "purpose"],
    },
  },
  {
    name: "sendEmail",
    description: "Send an email via user's Gmail. Requires user confirmation.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: { type: SchemaType.STRING },
        subject: { type: SchemaType.STRING },
        body: { type: SchemaType.STRING },
        campaignId: { type: SchemaType.STRING },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "remember",
    description:
      "Cognee remember — persist text to the user's knowledge graph. Use when the user shares durable facts: job preferences, target roles, constraints, or decisions worth recalling later.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: { type: SchemaType.STRING, description: "Fact or note to store" },
      },
      required: ["content"],
    },
  },
  {
    name: "recall",
    description:
      "Cognee recall — query permanent memory. Use before answering questions about past context, preferences, outreach history, or LinkedIn details beyond the profile snapshot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "What to look up in memory" },
        companyId: { type: SchemaType.STRING, description: "Optional company dataset to include" },
      },
      required: ["query"],
    },
  },
  {
    name: "improve",
    description:
      "Cognee improve — refine memory from user feedback. Use when the user corrects a match, says a company was a bad fit, or wants future results adjusted.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        feedback: { type: SchemaType.STRING },
      },
      required: ["feedback"],
    },
  },
  {
    name: "forget",
    description:
      "Cognee forget — prune a topic from memory. Use when the user explicitly wants something removed or forgotten.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: { type: SchemaType.STRING },
      },
      required: ["topic"],
    },
  },
  {
    name: "getOutreachStatus",
    description: "Get status of sent outreach emails and replies",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "resyncLinkedIn",
    description:
      "Re-sync the user's LinkedIn profile — pulls latest data from API + scrapes public profile for education, skills, experience, certifications, and activity. Use when the user says their profile info is stale or asks to refresh.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "importProfileData",
    description:
      "Ingest user-provided profile text into memory. Use when the user pastes their LinkedIn profile, resume, bio, or any personal career info directly in chat.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: "The profile/resume/bio text to store in memory",
        },
      },
      required: ["content"],
    },
  },
];

export interface AgentContext {
  userId: string;
  clerkId: string;
  cogneeToken?: string;
  // Called when a company-search pipeline is enqueued, so callers (e.g. the chat
  // route) can surface the jobId to the client and render live results.
  onSearchStarted?: (jobId: string) => void;
  // Set when the agent is running from WhatsApp — results get pushed back to this number.
  whatsappNumber?: string;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentContext
): Promise<string> {
  switch (name) {
    case "searchCompanies": {
      const proposed: Partial<CompanySearchParams> = {
        role: args.role as string,
        location: args.location as string | undefined,
        industry: args.industry as string | undefined,
        companySize: args.companySize as string | undefined,
        keywords: args.keywords as string[] | undefined,
        limit: (args.limit as number) ?? 10,
      };

      const readiness = await assessSearchReadiness(
        ctx.userId,
        ctx.clerkId,
        ctx.cogneeToken,
        proposed
      );

      if (!readiness.ready) {
        return JSON.stringify({
          blocked: true,
          reason: "insufficient_context",
          missing: readiness.missing,
          nextQuestion: readiness.nextQuestion,
          knownContext: readiness.contextSummary,
          hint: "Ask the user nextQuestion. Call remember() with their answer, then retry searchCompanies.",
        });
      }

      const params = toSearchParams(readiness.context, proposed);
      const job = await enqueueCompanyPipeline(
        ctx.userId,
        ctx.clerkId,
        params,
        ctx.cogneeToken,
        ctx.whatsappNumber
      );
      ctx.onSearchStarted?.(job.id);
      return JSON.stringify({
        message: "Company search started",
        jobId: job.id,
        status: "queued",
        searchContext: readiness.contextSummary,
        postSearchHint:
          "Tell the user search is running and results will appear shortly. When results are ready, ask: Want me to draft outreach emails for the top matches? Do not draft or send until they confirm.",
      });
    }

    case "getSearchResults": {
      const jobId = args.jobId as string | undefined;
      let status = jobId ? await getPipelineStatus(jobId, ctx.userId) : null;

      if (!status) {
        const latest = await prisma.pipelineJob.findFirst({
          where: { userId: ctx.userId, status: "completed" },
          orderBy: { updatedAt: "desc" },
        });
        if (latest) status = await getPipelineStatus(latest.id, ctx.userId);
      }

      if (!status) {
        return JSON.stringify({ error: "No search results found", status: "not_found" });
      }

      if (status.status !== "completed") {
        return JSON.stringify({
          jobId: status.jobId,
          status: status.status,
          progress: status.progress,
          message: status.message,
          hint: "Search still running. Tell the user to wait, then ask about outreach when complete.",
        });
      }

      const companies = (status.companies ?? []) as Array<{
        id: string;
        name: string;
        domain: string;
        matchScore: number;
        contacts?: Array<{ name: string; title?: string; email?: string }>;
      }>;

      return JSON.stringify({
        jobId: status.jobId,
        status: status.status,
        message: status.message,
        companies,
        outreachPrompt: "Want me to draft outreach emails for the top matches?",
        hint:
          companies.length > 0
            ? "Ask outreachPrompt if not already asked. If user said yes, draftEmail for top contacts (max 3 companies)."
            : "No matches — suggest broadening search. Do not offer outreach.",
      });
    }

    case "getCompanyDetails": {
      const company = await prisma.company.findUnique({
        where: { id: args.companyId as string },
        include: { contacts: true },
      });
      if (!company) return JSON.stringify({ error: "Company not found" });

      const memory = await recallUserAndCompany(
        ctx.clerkId,
        company.id,
        `What do we know about ${company.name}?`,
        ctx.cogneeToken
      );

      return JSON.stringify({ company, memory });
    }

    case "draftEmail": {
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        include: { profile: true },
      });

      const companyId = args.companyId as string | undefined;
      const company = companyId
        ? await prisma.company.findUnique({
            where: { id: companyId },
            include: { contacts: true },
          })
        : null;

      const contactName = args.contactName as string;
      const contact =
        company?.contacts.find(
          (c) => c.name.toLowerCase() === contactName.toLowerCase()
        ) ??
        company?.contacts.find((c) =>
          c.name.toLowerCase().includes(contactName.toLowerCase())
        ) ??
        company?.contacts.find((c) => c.email);

      const memory = companyId
        ? await recallUserAndCompany(
            ctx.clerkId,
            companyId,
            `Why is ${args.companyName} a fit? What should outreach mention?`,
            ctx.cogneeToken
          )
        : [];

      const draft = await draftOutreachEmail({
        senderName: user?.name ?? "there",
        senderProfile: buildSenderProfileSummary(user, user?.profile),
        contactName,
        contactTitle:
          (args.contactTitle as string | undefined) ??
          (contact?.title ? contact.title : undefined),
        contactEmail: contact?.email ? contact.email : undefined,
        companyName: (args.companyName as string) ?? company?.name ?? "the company",
        companyDescription: company?.description ? company.description : undefined,
        companyIndustry: company?.industry ? company.industry : undefined,
        purpose: args.purpose as string,
        memorySnippets: memory.map((m) => m.content),
      });

      const campaign = await prisma.outreachCampaign.create({
        data: {
          userId: ctx.userId,
          companyId: companyId ?? null,
          contactId: contact?.id ?? null,
          subject: draft.subject,
          body: draft.body,
          status: "draft",
        } as Prisma.OutreachCampaignUncheckedCreateInput,
      });

      return JSON.stringify({
        ...draft,
        campaignId: campaign.id,
        contactName,
        companyName: args.companyName,
      });
    }

    case "sendEmail": {
      const result = await sendEmail(ctx.clerkId, {
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
      });

      const campaign = await prisma.outreachCampaign.create({
        data: {
          userId: ctx.userId,
          companyId: (args.companyId as string | undefined) ?? null,
          subject: args.subject as string,
          body: args.body as string,
          status: "sent",
          sentAt: new Date(),
        } as Prisma.OutreachCampaignUncheckedCreateInput,
      });

      await remember(
        `Sent email to ${args.to}: "${args.subject}"`,
        { dataset: userDataset(ctx.clerkId), token: ctx.cogneeToken }
      );

      return JSON.stringify({ success: true, campaignId: campaign.id, result });
    }

    case "remember":
      await remember(args.content as string, {
        dataset: userDataset(ctx.clerkId),
        token: ctx.cogneeToken,
      });
      return JSON.stringify({ success: true });

    case "recall": {
      const results = await recallUserAndCompany(
        ctx.clerkId,
        args.companyId as string | undefined,
        args.query as string,
        ctx.cogneeToken
      );
      return JSON.stringify({ chunks: results });
    }

    case "improve":
      await improve(args.feedback as string, {
        dataset: userDataset(ctx.clerkId),
        token: ctx.cogneeToken,
      });
      return JSON.stringify({ success: true });

    case "forget":
      await forget({
        dataset: userDataset(ctx.clerkId),
        query: args.topic as string,
        token: ctx.cogneeToken,
      });
      return JSON.stringify({ success: true });

    case "getOutreachStatus": {
      const campaigns = await prisma.outreachCampaign.findMany({
        where: { userId: ctx.userId },
        include: { company: true, contact: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const emails = await fetchEmails(ctx.clerkId, 10);
      return JSON.stringify({ campaigns, recentEmails: emails });
    }

    case "importProfileData": {
      await remember(
        `Full profile (user-provided):\n${args.content as string}`,
        { dataset: userDataset(ctx.clerkId), token: ctx.cogneeToken }
      );
      return JSON.stringify({
        success: true,
        message: "Profile data stored in memory — will be used for future context",
      });
    }

    case "resyncLinkedIn": {
      const freshProfile = await getLinkedInProfileWithRetry(ctx.clerkId);
      if (!freshProfile) {
        return JSON.stringify({ error: "LinkedIn not connected or sync failed" });
      }

      await prisma.userProfile.updateMany({
        where: { userId: ctx.userId },
        data: {
          headline: (freshProfile.localizedHeadline as string) ?? undefined,
          linkedinData: freshProfile as object,
        },
      });

      await ingestUserProfile(ctx.clerkId, freshProfile, ctx.cogneeToken);

      const sections = [];
      if (freshProfile.experience) sections.push("experience");
      if (freshProfile.education) sections.push("education");
      if (freshProfile.skills) sections.push("skills");
      if (freshProfile.certifications) sections.push("certifications");
      if (freshProfile.activity) sections.push("activity");
      if (freshProfile.about) sections.push("about");

      return JSON.stringify({
        success: true,
        sectionsIngested: sections,
        message: `Profile re-synced with: ${sections.join(", ") || "basic info only"}`,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function* runAgent(
  message: string,
  history: Array<{ role: string; content: string }>,
  ctx: AgentContext
) {
  if (!config.geminiApiKey) {
    yield "Gemini API key is not configured. Please set GEMINI_API_KEY.";
    return;
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: tools }],
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: ctx.userId },
    include: { profile: true },
  });

  const contextPrefix = buildProfileContext(dbUser, dbUser?.profile);

  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
  });

  let result = await chat.sendMessage(contextPrefix + message);
  let response = result.response;

  while (response.functionCalls()?.length) {
    const functionCalls = response.functionCalls()!;
    const functionResponses = [];

    for (const call of functionCalls) {
      yield `\n[Using tool: ${call.name}]\n`;

      const toolResult = await executeTool(
        call.name,
        call.args as Record<string, unknown>,
        ctx
      );

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: JSON.parse(toolResult),
        },
      });
    }

    result = await chat.sendMessage(functionResponses);
    response = result.response;
  }

  const text = response.text();
  if (text) yield stripMarkdown(text);
}

export { getPipelineStatus };
