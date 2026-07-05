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
function buildEmployerSearchQueries(params: CompanySearchParams): string[] {
  const role = params.role;
  const location = params.location ?? "";
  const industry = params.industry ?? "";
  const keywords = (params.keywords ?? []).join(" ");
  const clean = (q: string) => q.replace(/\s+/g, " ").trim();

  return [
    clean(`${role} careers ${location} ${industry} ${keywords}`),
    clean(`${role} we are hiring ${industry} ${location}`),
    clean(`${role} jobs at startups ${industry} ${location} ${keywords}`),
  ];
}

export async function searchCompanies(params: CompanySearchParams) {
  const fetchLimit = Math.min(params.limit * 3, 30);
  const queries = buildEmployerSearchQueries(params);

  const companies: Array<{
    name: string;
    domain: string;
    description: string;
    sourceUrl: string;
  }> = [];

  const seenDomains = new Set<string>();

  // Run the query variants in parallel, then dedupe by domain.
  const resultSets = await Promise.all(
    queries.map((query) => serpSearch(query, fetchLimit).catch(() => []))
  );

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
