import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  SchemaType,
} from "@google/generative-ai";
import { config } from "../config.js";
import { prisma } from "@outpitch/db";
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
- If the profile snapshot already shows a target role or industry, skip the question and suggest one concrete next step (e.g. offer to search companies for that role).
- Surface at most one clear next action per reply rather than listing every feature.
- Write plain text ONLY. Never use markdown: no asterisks (* or **), no #, no bullet points, no bold/italic markers. This output is shown in web chat and WhatsApp, where markdown renders as broken characters.

Guidelines:
- If the user asks about stored context and the profile snapshot is insufficient, call recall first
- Never claim you lack LinkedIn profile data when it is present in context
- LinkedIn posts/activity are not ingested — only basic profile fields. Say so honestly if asked about posts
- Be proactive about suggesting companies and contacts
- Draft concise, personalized cold emails (under 150 words)
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
  user: { name: string | null; linkedinConnected: boolean } | null,
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
    description: "Search for companies hiring for a specific role. Runs async pipeline.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        role: { type: SchemaType.STRING, description: "Target job role" },
        location: { type: SchemaType.STRING, description: "Preferred location" },
        industry: { type: SchemaType.STRING, description: "Industry filter" },
        limit: { type: SchemaType.NUMBER, description: "Max companies (1-20)" },
      },
      required: ["role"],
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
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentContext
): Promise<string> {
  switch (name) {
    case "searchCompanies": {
      const params: CompanySearchParams = {
        role: args.role as string,
        location: args.location as string | undefined,
        industry: args.industry as string | undefined,
        limit: (args.limit as number) ?? 10,
      };
      const job = await enqueueCompanyPipeline(
        ctx.userId,
        ctx.clerkId,
        params,
        ctx.cogneeToken
      );
      return JSON.stringify({
        message: "Company search started",
        jobId: job.id,
        status: "queued",
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
      const profile = user?.profile;
      const draft = {
        to: "[contact email]",
        subject: `Interested in ${args.purpose} opportunities at ${args.companyName}`,
        body: `Hi ${args.contactName},\n\nI'm ${user?.name ?? "a professional"} with experience in ${profile?.targetRole ?? "my field"}. ${profile?.summary ?? ""}\n\nI came across ${args.companyName} and was impressed by your work. I'd love to connect about ${args.purpose}.\n\nWould you have 15 minutes for a quick chat?\n\nBest regards,\n${user?.name ?? ""}`,
        contactName: args.contactName,
        companyName: args.companyName,
      };
      return JSON.stringify(draft);
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
          companyId: args.companyId as string ?? (await prisma.company.findFirst())?.id ?? "",
          subject: args.subject as string,
          body: args.body as string,
          status: "sent",
          sentAt: new Date(),
        },
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
