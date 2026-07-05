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
    throw new Error(`Serper API error: ${response.status}`);
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

function buildEmployerSearchQueries(params: CompanySearchParams): string[] {
  const role = params.role;
  const location = params.location ?? "";
  const industry = params.industry ?? "";
  const keywords = (params.keywords ?? []).join(" ");
  const exclude = "-recruiting -staffing -agency -jobboard -headhunter";

  return [
    `"${role}" "we're hiring" OR "join our team" OR careers ${location} ${industry} ${keywords} ${exclude}`.trim(),
    `"${role}" startup OR company ${location} ${industry} ${keywords} careers open roles ${exclude}`.trim(),
    `"${role}" ${industry} ${location} ${keywords} engineering team product ${exclude}`.trim(),
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

  for (const query of queries) {
    const results = await serpSearch(query, fetchLimit);

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

  for (const title of titles) {
    const query = `site:linkedin.com/in "${title}" "${domain}"`;
    const results = await serpSearch(query, 5);

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
