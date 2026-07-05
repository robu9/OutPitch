import * as cheerio from "cheerio";
import robotsParser from "robots-parser";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAX_PAGES = 10;
const FETCH_TIMEOUT = 10000;

const SKIP_EXTENSIONS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
  ".css", ".js", ".zip", ".mp4", ".webm", ".woff", ".woff2", ".ttf",
  ".xml", ".json", ".csv", ".doc", ".docx", ".xls", ".xlsx",
]);

interface CrawlResult {
  url: string;
  text: string;
  emails: string[];
  title: string;
}

async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OutpitchBot/1.0 (+https://outpitch.app)",
        Accept: "text/html",
      },
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadRobots(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const robotsTxt = await fetchWithTimeout(robotsUrl);
    if (!robotsTxt) return null;
    return robotsParser(robotsUrl, robotsTxt);
  } catch {
    return null;
  }
}

function isUrlAllowed(robots: ReturnType<typeof robotsParser> | null, url: string): boolean {
  if (!robots) return true;
  return robots.isAllowed(url, "OutpitchBot") ?? true;
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}

function isSameSite(url: URL, domain: string): boolean {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const normalizedDomain = normalizeDomain(domain);
  return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
}

function isNonPageUrl(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  const dot = pathname.lastIndexOf(".");
  if (dot === -1) return false;
  return SKIP_EXTENSIONS.has(pathname.slice(dot));
}

function normalizeUrl(url: URL): string {
  const normalized = new URL(url.href);
  normalized.hash = "";
  if (normalized.pathname !== "/" && normalized.pathname.endsWith("/")) {
    normalized.pathname = normalized.pathname.slice(0, -1);
  }
  return normalized.href;
}

function extractInternalLinks(html: string, currentUrl: string, domain: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      return;
    }

    try {
      const absolute = new URL(href, currentUrl);
      if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return;
      if (!isSameSite(absolute, domain)) return;
      if (isNonPageUrl(absolute)) return;
      links.add(normalizeUrl(absolute));
    } catch {
      // Ignore malformed links.
    }
  });

  return Array.from(links);
}

function extractEmails(html: string, domain: string): string[] {
  const $ = cheerio.load(html);
  const emails = new Set<string>();
  const normalizedDomain = normalizeDomain(domain);

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const email = href.replace("mailto:", "").split("?")[0].trim();
      if (email.includes("@")) emails.add(email.toLowerCase());
    }
  });

  const text = $.text();
  const matches = text.match(EMAIL_REGEX) ?? [];
  for (const match of matches) {
    const email = match.toLowerCase();
    if (email.endsWith(`@${normalizedDomain}`) || email.endsWith(`.${normalizedDomain}`)) {
      emails.add(email);
    }
  }

  return Array.from(emails);
}

function extractText(html: string): { text: string; title: string } {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  const title = $("title").text().trim();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 5000);
  return { text, title };
}

export async function crawlCompanyWebsite(domain: string): Promise<{
  pages: CrawlResult[];
  allEmails: string[];
  summary: string;
}> {
  const baseUrl = `https://${domain}`;
  const robots = await loadRobots(baseUrl);
  const pages: CrawlResult[] = [];
  const allEmails = new Set<string>();
  const visited = new Set<string>();
  const queue = [baseUrl];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    let normalized: string;
    try {
      normalized = normalizeUrl(new URL(url));
    } catch {
      continue;
    }

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    if (!isUrlAllowed(robots, normalized)) continue;

    const html = await fetchWithTimeout(normalized);
    if (!html) continue;

    const emails = extractEmails(html, domain);
    const { text, title } = extractText(html);

    emails.forEach((e) => allEmails.add(e));
    pages.push({ url: normalized, text, emails, title });

    for (const link of extractInternalLinks(html, normalized, domain)) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }
  }

  const summary = pages
    .map((p) => `[${p.title}] ${p.text.slice(0, 500)}`)
    .join("\n\n");

  return {
    pages,
    allEmails: Array.from(allEmails),
    summary: summary.slice(0, 8000),
  };
}

export function guessEmailPatterns(
  firstName: string,
  lastName: string,
  domain: string,
  knownEmails: string[] = []
): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const candidates = [
    `${f}@${domain}`,
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}_${l}@${domain}`,
  ];

  if (knownEmails.length > 0) {
    const sample = knownEmails[0];
    const local = sample.split("@")[0];
    if (local.includes(".")) {
      candidates.unshift(`${f}.${l}@${domain}`);
    } else if (local.length <= f.length + 1) {
      candidates.unshift(`${f}@${domain}`);
    }
  }

  return [...new Set(candidates)];
}
