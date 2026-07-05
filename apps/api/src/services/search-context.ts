import type { CompanySearchParams } from "@outpitch/types";
import { buildUserMatchContext } from "./company-matcher.js";
import { DEFAULT_COMPANY_SIZE, resolveEffectiveCompanySize } from "./company-size.js";

export { DEFAULT_COMPANY_SIZE, resolveEffectiveCompanySize } from "./company-size.js";

export interface ResolvedSearchContext {
  role?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  keywords: string[];
  preferenceNotes: string[];
}

export interface SearchReadinessResult {
  ready: boolean;
  missing: SearchContextGap[];
  nextQuestion: string | null;
  context: ResolvedSearchContext;
  contextSummary: string;
}

const REMOTE_PATTERN =
  /\b(remote|fully remote|work from home|wfh|anywhere|distributed|location.?agnostic)\b/i;

const COMPANY_PREF_PATTERN =
  /\b(startup|early.?stage|series [a-d]|enterprise|faang|mid.?size|medium.?size|scale.?up|yc|seed|growth stage|small team|big corp|stealth|large compan|household.?name)\b/i;

export type SearchContextGap = "role" | "location" | "industry" | "company_preferences";

function pickFirst(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function extractRoleFromMemories(memories: string[]): string | undefined {
  for (const memory of memories) {
    const match = memory.match(
      /target role[:\s]+([^\n|]+)|looking for[:\s]+([^\n|]+)|(?:role|position)[:\s]+([^\n|]+)/i
    );
    const value = match?.[1] ?? match?.[2] ?? match?.[3];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function extractLocationFromMemories(memories: string[]): string | undefined {
  for (const memory of memories) {
    if (REMOTE_PATTERN.test(memory)) return "remote";
    const match = memory.match(
      /target location[:\s]+([^\n|]+)|(?:based in|located in|prefer[s]?)\s+([^\n|.]+)/i
    );
    const value = match?.[1] ?? match?.[2];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function extractIndustryFromMemories(memories: string[]): string | undefined {
  for (const memory of memories) {
    const match = memory.match(
      /target industr(?:y|ies)[:\s]+([^\n|]+)|(?:interested in|focus on|sector)[:\s]+([^\n|]+)/i
    );
    const value = match?.[1] ?? match?.[2];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function buildContextSummary(context: ResolvedSearchContext): string {
  const parts: string[] = [];
  if (context.role) parts.push(`Role: ${context.role}`);
  if (context.location) parts.push(`Location: ${context.location}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);
  if (context.companySize) parts.push(`Company size: ${context.companySize}`);
  else parts.push(`Company size: ${DEFAULT_COMPANY_SIZE} (default)`);
  if (context.keywords.length) parts.push(`Keywords: ${context.keywords.join(", ")}`);
  if (context.preferenceNotes.length) {
    parts.push(`Preferences: ${context.preferenceNotes.slice(0, 3).join("; ")}`);
  }
  return parts.join(" | ");
}

function nextDiscoveryQuestion(missing: SearchContextGap[], context: ResolvedSearchContext): string {
  const gap = missing[0];
  switch (gap) {
    case "role":
      return "What role are you targeting? For example, Senior Frontend Engineer or Product Designer.";
    case "location":
      return context.role
        ? `For ${context.role}, what location works for you — a specific city, region, or fully remote?`
        : "What location are you targeting, or are you open to fully remote?";
    case "industry":
      return "What industry or type of company should I focus on — for example AI startups, fintech, healthtech, or B2B SaaS?";
    case "company_preferences":
      return "I'll focus on medium-sized companies by default — roughly 50–500 people, not huge names like Vercel or LangChain. Want early-stage startups or larger enterprises instead? Any must-haves or deal-breakers?";
    default:
      return "Tell me a bit more about your ideal next role so I can find better matches.";
  }
}

export async function resolveSearchContext(
  userId: string,
  clerkId: string,
  cogneeToken: string | undefined,
  proposed?: Partial<CompanySearchParams>
): Promise<ResolvedSearchContext> {
  const userContext = await buildUserMatchContext(userId, clerkId, cogneeToken);

  const profileLines = userContext.summary.split("\n");
  const profileRole = profileLines.find((l) => l.startsWith("Target role:"))?.slice(12).trim();
  const profileLocation = profileLines.find((l) => l.startsWith("Target location:"))?.slice(16).trim();
  const profileIndustries = profileLines
    .find((l) => l.startsWith("Target industries:"))
    ?.slice(18)
    .trim();

  const role = pickFirst(proposed?.role, profileRole, extractRoleFromMemories(userContext.memories));
  const location = pickFirst(
    proposed?.location,
    profileLocation,
    extractLocationFromMemories(userContext.memories)
  );
  const industry = pickFirst(
    proposed?.industry,
    profileIndustries,
    extractIndustryFromMemories(userContext.memories)
  );

  const keywords = [...(proposed?.keywords ?? [])];
  const preferenceNotes = userContext.memories
    .filter((m) => COMPANY_PREF_PATTERN.test(m) || /\b(bad match|good match|avoid|prefer)\b/i.test(m))
    .slice(0, 5);

  return {
    role,
    location,
    industry,
    companySize: proposed?.companySize,
    keywords,
    preferenceNotes,
  };
}

export async function assessSearchReadiness(
  userId: string,
  clerkId: string,
  cogneeToken: string | undefined,
  proposed?: Partial<CompanySearchParams>
): Promise<SearchReadinessResult> {
  const userContext = await buildUserMatchContext(userId, clerkId, cogneeToken);

  const profileLines = userContext.summary.split("\n");
  const profileRole = profileLines.find((l) => l.startsWith("Target role:"))?.slice(12).trim();
  const profileLocation = profileLines.find((l) => l.startsWith("Target location:"))?.slice(16).trim();
  const profileIndustries = profileLines
    .find((l) => l.startsWith("Target industries:"))
    ?.slice(18)
    .trim();

  const context: ResolvedSearchContext = {
    role: pickFirst(proposed?.role, profileRole, extractRoleFromMemories(userContext.memories)),
    location: pickFirst(
      proposed?.location,
      profileLocation,
      extractLocationFromMemories(userContext.memories)
    ),
    industry: pickFirst(
      proposed?.industry,
      profileIndustries,
      extractIndustryFromMemories(userContext.memories)
    ),
    companySize: proposed?.companySize,
    keywords: [...(proposed?.keywords ?? [])],
    preferenceNotes: userContext.memories
      .filter((m) => COMPANY_PREF_PATTERN.test(m) || /\b(bad match|good match|avoid|prefer)\b/i.test(m))
      .slice(0, 5),
  };

  const missing: SearchContextGap[] = [];

  if (!context.role) missing.push("role");
  if (!context.location) missing.push("location");
  if (!context.industry) missing.push("industry");

  const ready = missing.length === 0;
  const contextSummary = buildContextSummary(context);

  return {
    ready,
    missing,
    nextQuestion: ready ? null : nextDiscoveryQuestion(missing, context),
    context,
    contextSummary,
  };
}

export function toSearchParams(
  context: ResolvedSearchContext,
  proposed?: Partial<CompanySearchParams>
): CompanySearchParams {
  return {
    role: context.role ?? proposed?.role ?? "",
    location: context.location ?? proposed?.location,
    industry: context.industry ?? proposed?.industry,
    companySize: resolveEffectiveCompanySize(context.companySize ?? proposed?.companySize),
    keywords: context.keywords.length ? context.keywords : proposed?.keywords,
    limit: proposed?.limit ?? 10,
  };
}
