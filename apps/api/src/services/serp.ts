import { config } from "../config.js";
import type { CompanySearchParams } from "@outpitch/types";

interface SerpResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerpResponse {
  organic_results?: SerpResult[];
}

async function serpSearch(query: string, num = 10): Promise<SerpResult[]> {
  if (!config.serpApiKey) {
    console.warn("SERPAPI_KEY not set, returning empty results");
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    api_key: config.serpApiKey,
    engine: "google",
    num: String(num),
  });

  const response = await fetch(`https://serpapi.com/search?${params}`);
  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }

  const data = (await response.json()) as SerpResponse;
  return data.organic_results ?? [];
}

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function searchCompanies(params: CompanySearchParams) {
  const parts = [
    params.role,
    "companies hiring",
    params.location,
    params.industry,
    ...(params.keywords ?? []),
  ].filter(Boolean);

  const query = parts.join(" ");
  const results = await serpSearch(query, params.limit);

  const companies: Array<{
    name: string;
    domain: string;
    description: string;
    sourceUrl: string;
  }> = [];

  const seenDomains = new Set<string>();

  for (const result of results) {
    const domain = extractDomain(result.link);
    if (!domain || seenDomains.has(domain)) continue;
    if (domain.includes("linkedin.com") || domain.includes("indeed.com")) continue;
    if (domain.includes("glassdoor.com") || domain.includes("google.com")) continue;

    seenDomains.add(domain);
    companies.push({
      name: result.title.split(" - ")[0].split(" | ")[0].trim(),
      domain,
      description: result.snippet,
      sourceUrl: result.link,
    });
  }

  return companies.slice(0, params.limit);
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
