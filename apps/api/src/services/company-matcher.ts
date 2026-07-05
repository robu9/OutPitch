import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@outpitch/db";
import { config } from "../config.js";
import { recall, userDataset } from "./cognee.js";

export const MIN_MATCH_SCORE = 55;

const RECRUITING_DOMAIN_PATTERNS = [
  "indeed.",
  "glassdoor.",
  "linkedin.",
  "ziprecruiter.",
  "monster.",
  "careerbuilder.",
  "dice.com",
  "hired.com",
  "talent.com",
  "flexjobs.",
  "simplyhired.",
  "snagajob.",
  "roberthalf.",
  "randstad.",
  "adecco.",
  "manpower.",
  "kellyservices.",
  "teksystems.",
  "aerotek.",
  "insightglobal.",
  "builtin.com",
  "wellfound.",
  "angel.co",
  "levels.fyi",
  "remote.co",
  "weworkremotely.",
  "jobvite.",
  "greenhouse.io",
  "lever.co",
  "workable.",
  "icims.",
  "bullhorn.",
  "recruitee.",
  "breezy.hr",
  "smartrecruiters.",
  "ashbyhq.",
  "otta.com",
  "cord.co",
  "hiredly.",
  "naukri.",
  "shine.",
  "foundit.",
  "seek.com",
  "totaljobs.",
  "reed.co",
  "cv-library.",
  "jobsite.",
  "stepstone.",
  "xing.com/jobs",
  "jobstreet.",
  "michaelpage.",
  "hays.",
  "roberthalf.",
  "adeccogroup.",
  "kforce.",
  "apexsystems.",
  "modis.",
  "cybercoders.",
  "lhh.com",
  "staffing",
  "recruit",
  "headhunt",
  "placement",
];

const RECRUITING_TEXT_PATTERNS = [
  /\bstaffing\b/i,
  /\brecruit(?:ing|ment|er)\s+(?:agency|firm|company|services?)\b/i,
  /\bemployment\s+agency\b/i,
  /\bjob\s+board\b/i,
  /\bjob\s+portal\b/i,
  /\bheadhunt(?:er|ing)\b/i,
  /\bplacement\s+agency\b/i,
  /\btalent\s+(?:solutions?|acquisition\s+firm)\b/i,
  /\bwe\s+help\s+(?:companies|businesses)\s+hire\b/i,
  /\bfind\s+(?:your|the)\s+(?:next\s+)?job\b/i,
  /\bsearch\s+(?:for\s+)?jobs\b/i,
  /\bapply\s+to\s+(?:thousands|hundreds)\s+of\s+jobs\b/i,
  /\bcareer\s+coaching\b/i,
  /\bresume\s+writing\b/i,
  /\bexecutive\s+search\b/i,
  /\bcontract\s+staffing\b/i,
  /\bIT\s+staffing\b/i,
  /\btemp(?:orary)?\s+staffing\b/i,
  /\bworkforce\s+solutions\b/i,
  /\bhire\s+talent\s+for\b/i,
  /\btop\s+\d+\s+companies\s+hiring\b/i,
  /\bbest\s+companies\s+to\s+work\s+for\b/i,
  /\bcompanies\s+hiring\s+now\b/i,
  /\bjob\s+openings\s+near\s+you\b/i,
];

export interface CompanyCandidate {
  name: string;
  domain: string;
  description: string;
  sourceUrl: string;
}

export interface UserMatchContext {
  summary: string;
  memories: string[];
}

export function isRecruitmentOrJobBoard(company: Pick<CompanyCandidate, "name" | "domain" | "description">): boolean {
  const domain = company.domain.toLowerCase();
  const text = `${company.name} ${company.description}`.toLowerCase();

  if (RECRUITING_DOMAIN_PATTERNS.some((pattern) => domain.includes(pattern))) {
    return true;
  }

  if (RECRUITING_TEXT_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  return false;
}

export async function buildUserMatchContext(
  userId: string,
  clerkId: string,
  cogneeToken?: string
): Promise<UserMatchContext> {
  const [profile, memories] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    recall(
      "User job search preferences: target role, skills, industries, location, company type, past company feedback, good and bad company matches, career goals",
      { datasets: [userDataset(clerkId)], token: cogneeToken, topK: 15 }
    ),
  ]);

  const parts: string[] = [];
  if (profile?.targetRole) parts.push(`Target role: ${profile.targetRole}`);
  if (profile?.targetLocation) parts.push(`Target location: ${profile.targetLocation}`);
  if (profile?.targetIndustries?.length) {
    parts.push(`Target industries: ${profile.targetIndustries.join(", ")}`);
  }
  if (profile?.skills?.length) parts.push(`Skills: ${profile.skills.join(", ")}`);
  if (profile?.summary) parts.push(`Summary: ${profile.summary}`);
  if (profile?.headline) parts.push(`Headline: ${profile.headline}`);

  const memoryTexts = memories.map((m) => m.content).filter(Boolean);

  return {
    summary: parts.join("\n"),
    memories: memoryTexts,
  };
}

export async function scoreCompanyAgainstUser(
  userContext: UserMatchContext,
  company: CompanyCandidate,
  companyContext: string,
  searchRole: string
): Promise<{ score: number; reason: string }> {
  if (isRecruitmentOrJobBoard(company)) {
    return { score: 0, reason: "Recruitment agency or job board" };
  }

  if (!config.geminiApiKey) {
    return fallbackScore(userContext, company, companyContext, searchRole);
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const memoryBlock =
    userContext.memories.length > 0
      ? `\nUser memory (preferences, past feedback, goals):\n${userContext.memories.slice(0, 8).join("\n---\n")}`
      : "";

  const prompt = `You score how well a company fits a job seeker's outreach targets.

Job seeker profile:
${userContext.summary || "No structured profile yet."}
${memoryBlock}

Search role: ${searchRole}

Company:
Name: ${company.name}
Domain: ${company.domain}
Description: ${company.description}
Website context: ${companyContext.slice(0, 2000)}

Rules:
- Score 0 if this is a recruitment agency, staffing firm, job board, career site aggregator, or company that helps others hire (not an actual employer).
- Score higher when the company likely employs people in the search role and matches user skills, industries, location, and memory preferences.
- Score lower for bad past feedback patterns in user memory.
- Return JSON only: {"score": number 0-100, "reason": "one short sentence"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { score?: number; reason?: string };
    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
    return { score, reason: parsed.reason ?? "Scored by memory match" };
  } catch (error) {
    console.warn(`[company-matcher] Gemini scoring failed for ${company.name}:`, error);
    return fallbackScore(userContext, company, companyContext, searchRole);
  }
}

function fallbackScore(
  userContext: UserMatchContext,
  company: CompanyCandidate,
  companyContext: string,
  searchRole: string
): { score: number; reason: string } {
  const haystack = `${company.name} ${company.description} ${companyContext}`.toLowerCase();
  const roleTokens = searchRole.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  let score = 40;

  for (const token of roleTokens) {
    if (haystack.includes(token)) score += 8;
  }

  if (userContext.summary) {
    for (const line of userContext.summary.split("\n")) {
      const value = line.split(":").slice(1).join(":").trim().toLowerCase();
      if (!value) continue;
      for (const part of value.split(/[,;]/)) {
        const term = part.trim();
        if (term.length > 2 && haystack.includes(term)) score += 5;
      }
    }
  }

  for (const memory of userContext.memories) {
    const lower = memory.toLowerCase();
    if (lower.includes("bad match") && lower.includes(company.name.toLowerCase())) {
      score -= 25;
    }
    if (lower.includes("good match") && lower.includes(company.name.toLowerCase())) {
      score += 15;
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: "Heuristic score (memory + role keywords)",
  };
}
