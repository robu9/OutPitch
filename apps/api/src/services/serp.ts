import { config } from "../config.js";
import type { CompanySearchParams } from "@outpitch/types";
import {
  DEFAULT_COMPANY_SIZE,
  resolveEffectiveCompanySize,
  userWantsLargeCompanies,
} from "./company-size.js";

interface SerpResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic?: SerpResult[];
  knowledgeGraph?: Record<string, unknown>;
}

async function serpSearch(query: string, num = 10): Promise<SerpResult[]> {
  if (!config.serperApiKey) {
    console.warn("SERPER_API_KEY not set, returning empty results");
    return [];
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": config.serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!response.ok) {
    // Degrade gracefully instead of throwing so one bad query (e.g. a free-plan
    // "pattern not allowed" 400, or a rate limit) doesn't fail the whole pipeline.
    const body = await response.text().catch(() => "");
    console.warn(`Serper ${response.status} for query "${query.slice(0, 80)}": ${body.slice(0, 120)}`);
    return [];
  }

  const data = (await response.json()) as SerperResponse;
  return data.organic ?? [];
}

export async function serperSearchRaw(
  query: string,
  num = 10
): Promise<SerperResponse> {
  if (!config.serperApiKey) return {};

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": config.serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!response.ok) return {};
  return (await response.json()) as SerperResponse;
}

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const BLOCKED_SEARCH_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "wikipedia.org",
  "medium.com",
  "quora.com",
];

// NOTE: plain-keyword queries only — the free Serper plan rejects advanced operators
// (quoted phrases, OR, site:, -exclusions) with a 400 "Query pattern not allowed for
// free accounts". Recruitment/job-board results are removed later by BLOCKED_SEARCH_DOMAINS
// and isRecruitmentOrJobBoard, so we don't need in-query exclusions.
//
// Cold outreach targets companies in the field — they do not need active job postings.
// Avoid "careers", "jobs", and "hiring" phrasing so results skew toward real employers.
function buildCompanySearchQueries(params: CompanySearchParams): string[] {
  const role = params.role;
  const location = params.location ?? "";
  const industry = params.industry ?? "";
  const companySize = resolveEffectiveCompanySize(params.companySize);
  const keywords = (params.keywords ?? []).join(" ");
  const clean = (q: string) => q.replace(/\s+/g, " ").trim();

  const queries: string[] = [];

  if (industry) {
    queries.push(clean(`${industry} mid-size company ${location} ${keywords}`));
    queries.push(clean(`${industry} growth stage company ${location} ${keywords}`));
    queries.push(clean(`${role} ${industry} company ${location} ${companySize}`));
  } else {
    queries.push(clean(`${role} mid-size company ${location} ${keywords}`));
    queries.push(clean(`${role} growth stage company ${location} ${keywords}`));
    queries.push(clean(`${role} company ${location} ${companySize}`));
  }

  return queries;
}

export async function searchCompaniesWithPerplexity(params: CompanySearchParams): Promise<Array<{
  name: string;
  domain: string;
  description: string;
  sourceUrl: string;
}>> {
  if (!config.perplexityApiKey) {
    console.warn("PERPLEXITY_API_KEY not set for Perplexity company search");
    return [];
  }

  const effectiveSize = resolveEffectiveCompanySize(params.companySize);
  const allowLargeCompanies = userWantsLargeCompanies({
    companySize: params.companySize,
    keywords: params.keywords,
  });

  const sizeGuidance = allowLargeCompanies
    ? `Company Size: ${effectiveSize} (user asked for larger or enterprise companies — include them when relevant)`
    : `Company Size: ${effectiveSize}

IMPORTANT — company size bias (default):
- Prioritize medium-sized companies: roughly 50–500 employees, Series B–D, profitable scale-ups, or strong regional players in the space.
- Do NOT recommend household-name tech giants or extremely well-known companies (e.g. Google, Meta, Amazon, Microsoft, Apple, Netflix, Stripe, Vercel, Hugging Face, LangChain, OpenAI, Anthropic, Notion, Figma) unless the user explicitly asked for large/enterprise companies.
- Prefer lesser-known but real employers where cold outreach is more likely to reach a decision-maker.`;

  const prompt = `You are an expert company discovery agent. Find and recommend real, existing companies that operate in the user's target field and could plausibly employ people in the search role. Active job postings are not required — cold outreach targets real employers in the space. Use your web search capabilities to find accurate, up-to-date companies.

Role: ${params.role}
Location: ${params.location ?? "Any"}
Industry: ${params.industry ?? "Any"}
${sizeGuidance}
Keywords/Preferences: ${(params.keywords ?? []).join(", ") || "None"}

Rules:
- Recommend ONLY real, actual companies with valid, operational domains (e.g. "posthog.com", "inngest.com").
- Avoid generic placeholders or fake websites.
- Provide a concise description of what they do and why they match.
- For each company, provide a valid "sourceUrl" (their main domain or about page, e.g. "https://posthog.com" or "https://posthog.com/about").
- NEVER recommend recruitment agencies, staffing firms, or job boards (e.g. indeed, glassdoor, linkedin, upwork).
- Return a JSON object with a single "companies" key containing an array of up to ${params.limit || 10} companies:
{
  "companies": [
    {
      "name": "Company Name",
      "domain": "companydomain.com",
      "description": "Short description of company",
      "sourceUrl": "https://companydomain.com/careers"
    }
  ]
}`;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are an expert company discovery agent that outputs ONLY structured JSON conforming to the requested schema. Default to medium-sized companies (${DEFAULT_COMPANY_SIZE}) unless the user explicitly wants large or enterprise companies.`,
          },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: {
              type: "object",
              properties: {
                companies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      domain: { type: "string" },
                      description: { type: "string" },
                      sourceUrl: { type: "string" }
                    },
                    required: ["name", "domain", "description", "sourceUrl"]
                  }
                }
              },
              required: ["companies"]
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`Perplexity API error ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as {
      companies?: Array<{ name: string; domain: string; description: string; sourceUrl: string }>;
    };
    return parsed.companies ?? [];
  } catch (error) {
    console.error("[serp] Perplexity company search failed:", error);
    return [];
  }
}

export async function searchCompanies(params: CompanySearchParams) {
  const fetchLimit = Math.min(params.limit * 3, 30);
  const queries = buildCompanySearchQueries(params);

  const companies: Array<{
    name: string;
    domain: string;
    description: string;
    sourceUrl: string;
  }> = [];

  const seenDomains = new Set<string>();

  // Run the query variants and Perplexity search in parallel!
  const [resultSets, perplexityResults] = await Promise.all([
    Promise.all(queries.map((query) => serpSearch(query, fetchLimit).catch(() => []))),
    searchCompaniesWithPerplexity(params).catch(() => []),
  ]);

  // First, add Perplexity results (they are highly targeted and freshly researched online)
  for (const result of perplexityResults) {
    let domain = result.domain.trim().toLowerCase();
    if (domain.includes("://")) {
      const extracted = extractDomain(domain);
      if (extracted) domain = extracted;
    }
    domain = domain.replace(/^www\./, "");

    if (!domain || seenDomains.has(domain)) continue;
    if (BLOCKED_SEARCH_DOMAINS.some((blocked) => domain.includes(blocked))) continue;

    seenDomains.add(domain);
    companies.push({
      name: result.name,
      domain,
      description: result.description,
      sourceUrl: result.sourceUrl,
    });
  }

  // Then add Serper results
  for (const results of resultSets) {
    for (const result of results) {
      const domain = extractDomain(result.link);
      if (!domain || seenDomains.has(domain)) continue;
      if (BLOCKED_SEARCH_DOMAINS.some((blocked) => domain.includes(blocked))) continue;

      seenDomains.add(domain);
      companies.push({
        name: result.title.split(" - ")[0].split(" | ")[0].trim(),
        domain,
        description: result.snippet,
        sourceUrl: result.link,
      });
    }
  }

  return companies;
}

export interface PersonSearchResult {
  name: string;
  title: string;
  linkedinUrl?: string;
}

interface PerplexityAgentOutputItem {
  type: string;
  queries?: string[];
  results?: Array<{
    url?: string;
    title?: string;
    snippet?: string;
  }>;
  role?: string;
  content?: Array<{
    type: string;
    text?: string;
  }>;
}

function parseNameFromLinkedInTitle(title: string): string {
  const nameMatch = title.match(/^([^-|–]+)/);
  return nameMatch?.[1]?.trim() ?? "Unknown";
}

function parseJsonFromAgentText(text: string): { people?: PersonSearchResult[] } | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate) as { people?: PersonSearchResult[] };
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as { people?: PersonSearchResult[] };
    } catch {
      return null;
    }
  }
}

function extractAgentOutputText(output: PerplexityAgentOutputItem[]): string {
  return output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((c) => c.type === "output_text" && c.text)
    .map((c) => c.text!)
    .join("");
}

function peopleFromPerplexityAgentOutput(output: PerplexityAgentOutputItem[]): PersonSearchResult[] {
  const people: PersonSearchResult[] = [];

  const outputText = extractAgentOutputText(output);
  const parsed = outputText ? parseJsonFromAgentText(outputText) : null;
  if (parsed?.people?.length) {
    for (const person of parsed.people) {
      if (!person.name?.trim()) continue;
      people.push({
        name: person.name.trim(),
        title: person.title?.trim() || "Contact",
        linkedinUrl: person.linkedinUrl,
      });
    }
  }

  for (const item of output) {
    if (item.type !== "people_search_results") continue;
    for (const result of item.results ?? []) {
      const url = result.url ?? "";
      if (!url.includes("linkedin.com/in/")) continue;
      const name = parseNameFromLinkedInTitle(result.title ?? "");
      if (name === "Unknown") continue;
      people.push({
        name,
        title: result.snippet?.slice(0, 120) || "Contact",
        linkedinUrl: url,
      });
    }
  }

  const seen = new Set<string>();
  return people.filter((p) => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchPeopleWithPerplexity(
  domain: string,
  companyName: string,
  titles: string[] = ["founder", "CEO", "recruiter", "talent", "HR"]
): Promise<PersonSearchResult[]> {
  if (!config.perplexityApiKey) {
    return [];
  }

  const input = `Find up to 5 real professionals at ${companyName} (${domain}) who are good cold-outreach targets for job seekers.

Prioritize people in these roles: ${titles.join(", ")}.

Use the people_search tool to find LinkedIn profiles and confirm they are associated with ${companyName} or ${domain}.

Return ONLY valid JSON with no markdown:
{
  "people": [
    { "name": "Full Name", "title": "Job Title", "linkedinUrl": "https://www.linkedin.com/in/..." }
  ]
}`;

  try {
    const response = await fetch("https://api.perplexity.ai/v1/agent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        reasoning: { effort: "low" },
        tools: [
          {
            type: "people_search",
            max_tokens: 5000,
            max_tokens_per_page: 500,
          },
        ],
        max_steps: 3,
        input,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`Perplexity people_search error ${response.status} for ${domain}: ${errText}`);
      return [];
    }

    const data = (await response.json()) as {
      output?: PerplexityAgentOutputItem[];
      output_text?: string;
    };

    if (data.output?.length) {
      return peopleFromPerplexityAgentOutput(data.output);
    }

    if (data.output_text) {
      const parsed = parseJsonFromAgentText(data.output_text);
      return (parsed?.people ?? []).filter((p) => p.name?.trim());
    }

    return [];
  } catch (error) {
    console.error(`[serp] Perplexity people_search failed for ${domain}:`, error);
    return [];
  }
}

async function searchPeopleAtCompanyWithSerper(
  domain: string,
  titles: string[] = ["founder", "CEO", "recruiter", "talent", "HR"]
): Promise<PersonSearchResult[]> {
  const people: PersonSearchResult[] = [];

  // Plain-keyword query (free Serper plan rejects site:/quoted operators). We still
  // keep only linkedin.com/in profile links below, so precision stays reasonable.
  const resultSets = await Promise.all(
    titles.map((title) =>
      serpSearch(`${title} ${domain} linkedin`, 5)
        .then((results) => ({ title, results }))
        .catch(() => ({ title, results: [] as Awaited<ReturnType<typeof serpSearch>> }))
    )
  );

  for (const { title, results } of resultSets) {
    for (const result of results) {
      if (!result.link.includes("linkedin.com/in/")) continue;
      people.push({
        name: parseNameFromLinkedInTitle(result.title),
        title,
        linkedinUrl: result.link,
      });
    }
  }

  const seen = new Set<string>();
  return people.filter((p) => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchPeopleAtCompany(
  domain: string,
  companyName?: string,
  titles: string[] = ["founder", "CEO", "recruiter", "talent", "HR"]
): Promise<PersonSearchResult[]> {
  if (config.perplexityApiKey && companyName) {
    const perplexityPeople = await searchPeopleWithPerplexity(domain, companyName, titles);
    if (perplexityPeople.length > 0) {
      return perplexityPeople;
    }
  }

  return searchPeopleAtCompanyWithSerper(domain, titles);
}

export { serpSearch };
