import { config } from "../config.js";
import type { CompanySearchParams } from "@outpitch/types";

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
  const companySize = params.companySize ?? "";
  const keywords = (params.keywords ?? []).join(" ");
  const clean = (q: string) => q.replace(/\s+/g, " ").trim();

  const queries: string[] = [];

  if (industry) {
    queries.push(clean(`${industry} company ${location} ${companySize} ${keywords}`));
    queries.push(clean(`${industry} startup ${location} ${keywords}`));
    queries.push(clean(`${role} ${industry} company ${location}`));
  } else {
    queries.push(clean(`${role} company ${location} ${companySize} ${keywords}`));
    queries.push(clean(`${role} startup ${location} ${keywords}`));
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

  const prompt = `You are an expert company discovery agent. Find and recommend real, existing companies that operate in the user's target field and could plausibly employ people in the search role. Active job postings are not required — cold outreach targets real employers in the space. Use your web search capabilities to find accurate, up-to-date companies.

Role: ${params.role}
Location: ${params.location ?? "Any"}
Industry: ${params.industry ?? "Any"}
Company Size: ${params.companySize ?? "Any"}
Keywords/Preferences: ${(params.keywords ?? []).join(", ") || "None"}

Rules:
- Recommend ONLY real, actual companies with valid, operational domains (e.g. "stripe.com", "vercel.com").
- Avoid generic placeholders or fake websites.
- Provide a concise description of what they do and why they match.
- For each company, provide a valid "sourceUrl" (their main domain or about page, e.g. "https://stripe.com" or "https://stripe.com/about").
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
          { role: "system", content: "You are an expert company discovery agent that outputs ONLY structured JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
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

export async function searchPeopleAtCompany(
  domain: string,
  titles: string[] = ["founder", "CEO", "recruiter", "talent", "HR"]
) {
  const people: Array<{ name: string; title: string; linkedinUrl?: string }> = [];

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
      const nameMatch = result.title.match(/^([^-|]+)/);
      const name = nameMatch?.[1]?.trim() ?? "Unknown";
      people.push({
        name,
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

export { serpSearch };
