import * as cheerio from "cheerio";
import robotsParser from "robots-parser";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAX_PAGES = 10;
const FETCH_TIMEOUT = 10000;

const CRAWL_PATHS = ["/", "/about", "/about-us", "/team", "/people", "/careers", "/jobs", "/contact"];

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

async function isAllowed(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const robotsTxt = await fetchWithTimeout(robotsUrl);
    if (!robotsTxt) return true;
    const robots = robotsParser(robotsUrl, robotsTxt);
    return robots.isAllowed(url, "OutpitchBot") ?? true;
  } catch {
    return true;
  }
}

function extractEmails(html: string, domain: string): string[] {
  const $ = cheerio.load(html);
  const emails = new Set<string>();

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
    if (email.endsWith(`@${domain}`) || email.endsWith(`.${domain}`)) {
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
  const pages: CrawlResult[] = [];
  const allEmails = new Set<string>();

  for (const path of CRAWL_PATHS) {
    if (pages.length >= MAX_PAGES) break;

    const url = path === "/" ? baseUrl : `${baseUrl}${path}`;
    const allowed = await isAllowed(url);
    if (!allowed) continue;

    const html = await fetchWithTimeout(url);
    if (!html) continue;

    const emails = extractEmails(html, domain);
    const { text, title } = extractText(html);

    emails.forEach((e) => allEmails.add(e));
    pages.push({ url, text, emails, title });
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
