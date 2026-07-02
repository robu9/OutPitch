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
  recall,
  improve,
  forget,
  userDataset,
  recallUserAndCompany,
} from "../services/cognee.js";
import { sendEmail, fetchEmails } from "../services/composio.js";
import { buildLinkedInProfileSummary } from "../services/linkedin-profile.js";
import { enqueueCompanyPipeline, getPipelineStatus } from "../jobs/company-pipeline.js";

const SYSTEM_PROMPT = `You are Outpitch, an AI job search assistant. You help users find companies, discover founder and recruiter contacts, draft personalized outreach emails, and track their job search progress.

You have function tools (searchCompanies, recallContext, rememberFact, draftEmail, sendEmail, etc.) and receive the user's LinkedIn profile from their connected Composio account on every message.

Guidelines:
- Use the profile context provided to you; never claim you lack access to the user's LinkedIn data when it is present in context
- LinkedIn profile data comes from the user's OAuth connection via Composio (LINKEDIN_GET_MY_INFO + LINKEDIN_GET_PERSON)
- Use recallContext when you need additional memory beyond the profile snapshot
- Be proactive about suggesting companies and contacts
- Draft concise, personalized cold emails (under 150 words)
- Never send emails without explicit user confirmation
- Give actionable career advice based on the user's profile and outreach history
- When user gives feedback on companies, use improveMemory to refine future matches`;

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
    name: "rememberFact",
    description: "Store an important fact about the user in memory",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        fact: { type: SchemaType.STRING },
      },
      required: ["fact"],
    },
  },
  {
    name: "recallContext",
    description: "Recall relevant context from memory",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING },
        companyId: { type: SchemaType.STRING },
      },
      required: ["query"],
    },
  },
  {
    name: "improveMemory",
    description: "Improve memory based on user feedback",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        feedback: { type: SchemaType.STRING },
      },
      required: ["feedback"],
    },
  },
  {
    name: "forgetTopic",
    description: "Remove a topic from memory",
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

    case "rememberFact":
      await remember(args.fact as string, {
        dataset: userDataset(ctx.clerkId),
        token: ctx.cogneeToken,
      });
      return JSON.stringify({ success: true });

    case "recallContext": {
      const results = await recallUserAndCompany(
        ctx.clerkId,
        args.companyId as string | undefined,
        args.query as string,
        ctx.cogneeToken
      );
      return JSON.stringify(results);
    }

    case "improveMemory":
      await improve(args.feedback as string, {
        dataset: userDataset(ctx.clerkId),
        token: ctx.cogneeToken,
      });
      return JSON.stringify({ success: true });

    case "forgetTopic":
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

  const userContext = await recall(
    "user profile preferences job search goals",
    { datasets: [userDataset(ctx.clerkId)], token: ctx.cogneeToken, topK: 5 }
  );

  const profilePrefix = buildProfileContext(dbUser, dbUser?.profile);
  const memoryPrefix =
    userContext.length > 0
      ? `[Memory context: ${userContext.map((r) => r.content).join("; ")}]\n\n`
      : "";
  const contextPrefix = profilePrefix + memoryPrefix;

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
  if (text) yield text;

  await remember(`User said: ${message}\nAssistant: ${text}`, {
    dataset: userDataset(ctx.clerkId),
    token: ctx.cogneeToken,
  });
}

export { getPipelineStatus };
