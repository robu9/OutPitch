import * as cheerio from "cheerio";
import { config } from "../config.js";

const FETCH_TIMEOUT = 20000;

export interface LinkedInScrapedProfile {
  name?: string;
  headline?: string;
  location?: string;
  connectionCount?: string;
  followerCount?: string;
  about?: string;
  experience: Array<{
    title?: string;
    company?: string;
    duration?: string;
    location?: string;
    description?: string;
  }>;
  education: Array<{
    school?: string;
    degree?: string;
    field?: string;
    years?: string;
    description?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name?: string;
    issuer?: string;
  }>;
  activity: Array<{
    type: string;
    text: string;
    url?: string;
  }>;
  projects: Array<{
    name?: string;
    description?: string;
  }>;
  scrapedAt: string;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs = FETCH_TIMEOUT
): Promise<{ ok: boolean; status: number; html: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers,
    });
    const html = await response.text();
    return { ok: response.ok, status: response.status, html };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("abort")) {
      console.warn(`LinkedIn fetch error for ${url}: ${msg}`);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLinkedInPage(vanityName: string): Promise<string | null> {
  const ua = pickUA();

  const baseHeaders: Record<string, string> = {
    "User-Agent": ua,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  const urls = [
    `https://www.linkedin.com/in/${vanityName}/`,
    `https://www.linkedin.com/in/${vanityName}`,
  ];

  for (const url of urls) {
    const result = await fetchWithTimeout(url, baseHeaders);
    if (result && hasUsableContent(result.html)) {
      return result.html;
    }
    if (result) {
      console.warn(
        `LinkedIn returned ${result.status} for ${url} — ` +
          (isAuthwall(result.html) ? "authwall" : "no usable content")
      );
      if (isAuthwall(result.html)) {
        const parsed = parseFromAuthwalledPage(result.html);
        if (parsed) return result.html;
      }
    }
  }

  // Fallback: try with Google as referer (LinkedIn shows more to Google-referred traffic)
  const googleRefHeaders = {
    ...baseHeaders,
    Referer: "https://www.google.com/",
    "Sec-Fetch-Site": "cross-site",
  };
  const googleResult = await fetchWithTimeout(urls[0]!, googleRefHeaders);
  if (googleResult && hasUsableContent(googleResult.html)) {
    return googleResult.html;
  }
  if (googleResult?.html && hasAnyStructuredData(googleResult.html)) {
    return googleResult.html;
  }

  // Fallback: try Wayback Machine for a recent snapshot
  const waybackHtml = await fetchWaybackSnapshot(vanityName);
  if (waybackHtml) return waybackHtml;

  return null;
}

function isAuthwall(html: string): boolean {
  return html.includes("/authwall") || html.includes("auth_wall") || html.includes("sign-in-modal");
}

function hasUsableContent(html: string): boolean {
  if (!html || html.length < 500) return false;
  if (isAuthwall(html) && !hasAnyStructuredData(html)) return false;
  return (
    html.includes("application/ld+json") ||
    html.includes("top-card") ||
    html.includes("profile-section") ||
    html.includes('data-section="') ||
    html.includes("pv-top-card") ||
    html.includes("experience-section") ||
    html.includes('"@type":"Person"')
  );
}

function hasAnyStructuredData(html: string): boolean {
  return (
    html.includes("application/ld+json") ||
    html.includes('og:title') ||
    html.includes('"@type":"Person"')
  );
}

function parseFromAuthwalledPage(html: string): Partial<LinkedInScrapedProfile> | null {
  const $ = cheerio.load(html);
  const profile: Partial<LinkedInScrapedProfile> = {};
  let found = false;

  // JSON-LD is often present even on authwalled pages
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      if (data["@type"] === "Person") {
        found = true;
        if (data.name) profile.name = data.name;
        if (data.jobTitle) profile.headline = data.jobTitle;
        if (data.address?.addressLocality) profile.location = data.address.addressLocality;
        if (data.alumniOf) {
          profile.education = (Array.isArray(data.alumniOf) ? data.alumniOf : [data.alumniOf]).map(
            (s: any) => ({
              school: s.name,
              years: s.member?.startDate
                ? `${s.member.startDate} - ${s.member.endDate ?? "Present"}`
                : undefined,
            })
          );
        }
        if (data.worksFor) {
          profile.experience = (Array.isArray(data.worksFor) ? data.worksFor : [data.worksFor]).map(
            (j: any) => ({
              title: j.member?.jobTitle ?? j.jobTitle,
              company: j.name,
            })
          );
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // OpenGraph / meta fallbacks
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  if (ogTitle && !profile.name) {
    profile.name = ogTitle.replace(/\s*[-|].*$/, "").trim();
    found = true;
  }
  if (ogDesc && !profile.headline) {
    profile.headline = ogDesc.slice(0, 200);
    found = true;
  }

  // Title tag fallback
  if (!profile.name) {
    const title = $("title").text();
    const titleMatch = title.match(/^(.+?)\s*[-|–]/);
    if (titleMatch) {
      profile.name = titleMatch[1]!.trim();
      found = true;
    }
  }

  return found ? profile : null;
}

async function fetchWaybackSnapshot(vanityName: string): Promise<string | null> {
  const targetUrl = `https://www.linkedin.com/in/${vanityName}/`;
  try {
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}&timestamp=20240101`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": pickUA() },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as {
      archived_snapshots?: { closest?: { url?: string; available?: boolean } };
    };
    const snapshot = data.archived_snapshots?.closest;
    if (!snapshot?.available || !snapshot.url) return null;

    const snapshotRes = await fetchWithTimeout(snapshot.url, {
      "User-Agent": pickUA(),
      Accept: "text/html",
    }, 15000);

    if (snapshotRes?.ok && snapshotRes.html.length > 1000) {
      console.log(`Using Wayback Machine snapshot for ${vanityName}`);
      return snapshotRes.html;
    }
  } catch {
    // Wayback not available
  }
  return null;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseProfilePage(html: string): LinkedInScrapedProfile {
  const $ = cheerio.load(html);

  const profile: LinkedInScrapedProfile = {
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    activity: [],
    projects: [],
    scrapedAt: new Date().toISOString(),
  };

  // ── JSON-LD structured data (most reliable, often present even on authwalled pages) ──
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      if (data["@type"] === "Person") {
        if (!profile.name && data.name) profile.name = data.name;
        if (!profile.headline && data.jobTitle) profile.headline = data.jobTitle;
        if (!profile.location && data.address?.addressLocality) {
          profile.location = data.address.addressLocality;
        }
        if (data.alumniOf && profile.education.length === 0) {
          const schools = Array.isArray(data.alumniOf) ? data.alumniOf : [data.alumniOf];
          for (const s of schools) {
            profile.education.push({
              school: s.name,
              years: s.member?.startDate
                ? `${s.member.startDate} - ${s.member.endDate ?? "Present"}`
                : undefined,
            });
          }
        }
        if (data.worksFor && profile.experience.length === 0) {
          const jobs = Array.isArray(data.worksFor) ? data.worksFor : [data.worksFor];
          for (const j of jobs) {
            profile.experience.push({
              title: j.member?.jobTitle ?? j.jobTitle,
              company: j.name,
            });
          }
        }
        if (data.knowsAbout && profile.skills.length === 0) {
          const items = Array.isArray(data.knowsAbout) ? data.knowsAbout : [data.knowsAbout];
          for (const item of items) {
            const skill = typeof item === "string" ? item : item.name;
            if (skill) profile.skills.push(skill);
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // ── OpenGraph / meta tags ──
  if (!profile.name) {
    const ogTitle = $('meta[property="og:title"]').attr("content");
    if (ogTitle) {
      profile.name = ogTitle.replace(/\s*[-|–].*$/, "").trim() || undefined;
    }
  }
  if (!profile.headline) {
    const ogDesc = $('meta[property="og:description"]').attr("content");
    if (ogDesc) {
      const parts = ogDesc.split("·").map((s) => s.trim());
      profile.headline = parts[0] || undefined;
      if (!profile.location && parts[1]) {
        profile.location = parts[1].replace(/\s*\d+\s*(connections?|followers?).*$/i, "").trim() || undefined;
      }
    }
  }
  if (!profile.name) {
    const title = $("title").text();
    const titleMatch = title.match(/^(.+?)\s*[-|–]/);
    if (titleMatch) profile.name = titleMatch[1]!.trim();
  }

  // ── HTML parsing (works on full public profile pages) ──
  const topCard = $(".top-card-layout, .pv-top-card, [data-section='profile']");
  if (!profile.name) {
    profile.name =
      cleanText(
        topCard.find("h1").first().text() ||
          $('h1[class*="name"]').first().text() ||
          $("h1").first().text()
      ) || undefined;
  }

  if (!profile.headline) {
    profile.headline =
      cleanText(
        topCard.find("h2").first().text() ||
          $('[class*="headline"]').first().text()
      ) || undefined;
  }

  if (!profile.location) {
    const locationEl = $('[class*="location"], [class*="top-card"] .text-body-small').first();
    profile.location = cleanText(locationEl.text()) || undefined;
  }

  // Connections/followers
  const subline = $(".top-card-layout__first-subline, [class*=\"connections\"]").text();
  const connMatch = subline.match(/(\d[\d,]*)\s*connections/i);
  const followerMatch = subline.match(/(\d[\d,]*)\s*followers/i);
  if (connMatch) profile.connectionCount = connMatch[1];
  if (followerMatch) profile.followerCount = followerMatch[1];

  // About section
  if (!profile.about) {
    const aboutSection = $(
      '[class*="about"] [class*="text-body"], ' +
        '#about ~ .display-flex, ' +
        'section.summary .core-section-container__content, ' +
        '[data-section="summary"] p'
    );
    profile.about = cleanText(aboutSection.text()) || undefined;
  }

  // Experience section (only if JSON-LD didn't already populate it)
  if (profile.experience.length === 0) {
    $('section#experience li, [data-section="experience"] li, .experience-section li').each(
      (_, el) => {
        const $el = $(el);
        const title = cleanText($el.find('[class*="title"], h3').first().text());
        const company = cleanText(
          $el.find('[class*="subtitle"], [class*="company"]').first().text()
        );
        const duration = cleanText(
          $el.find('[class*="date-range"], [class*="duration"], .date-range').first().text()
        );
        const location = cleanText($el.find('[class*="location"]').first().text());
        const description = cleanText(
          $el.find('[class*="description"], .show-more-less-text').first().text()
        );
        if (title || company) {
          profile.experience.push({ title, company, duration, location, description });
        }
      }
    );
  }

  // Education section
  if (profile.education.length === 0) {
    $('section#education li, [data-section="education"] li, .education-section li').each(
      (_, el) => {
        const $el = $(el);
        const school = cleanText($el.find("h3, [class*='name']").first().text());
        const degree = cleanText(
          $el.find("[class*='degree'], [class*='subtitle']").first().text()
        );
        const field = cleanText($el.find("[class*='field']").first().text());
        const years = cleanText($el.find("[class*='date'], .date-range").first().text());
        const description = cleanText($el.find("[class*='description']").first().text());
        if (school) {
          profile.education.push({ school, degree, field, years, description });
        }
      }
    );
  }

  // Skills section
  if (profile.skills.length === 0) {
    $('section#skills li, [data-section="skills"] li, .skills-section li').each((_, el) => {
      const skill = cleanText($(el).find("h3, [class*='name'], span").first().text());
      if (skill && skill.length < 100) {
        profile.skills.push(skill);
      }
    });
  }

  // Certifications
  $(
    'section#licenses_and_certifications li, [data-section="certifications"] li, .certifications-section li'
  ).each((_, el) => {
    const $el = $(el);
    const name = cleanText($el.find("h3, [class*='name']").first().text());
    const issuer = cleanText($el.find("[class*='subtitle'], [class*='issuer']").first().text());
    if (name) {
      profile.certifications.push({ name, issuer });
    }
  });

  // Projects
  $('section#projects li, [data-section="projects"] li').each((_, el) => {
    const $el = $(el);
    const name = cleanText($el.find("h3, [class*='name']").first().text());
    const description = cleanText($el.find("[class*='description']").first().text());
    if (name) {
      profile.projects.push({ name, description });
    }
  });

  // Activity
  $('section#activity li, [data-section="activity"] li, .activities-section li').each(
    (_, el) => {
      const $el = $(el);
      const text = cleanText($el.text()).slice(0, 500);
      const url = $el.find("a").first().attr("href") ?? undefined;
      if (text) {
        profile.activity.push({ type: "activity", text, url });
      }
    }
  );

  return profile;
}

/**
 * Use Serper.dev to search Google for the LinkedIn profile and extract
 * structured data from the search result snippets / knowledge panel.
 * Google indexes LinkedIn profiles and often has richer data than LinkedIn
 * serves to direct HTTP requests.
 */
async function scrapeViaSerper(vanityName: string): Promise<LinkedInScrapedProfile | null> {
  if (!config.serperApiKey) return null;

  const profile: LinkedInScrapedProfile = {
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    activity: [],
    projects: [],
    scrapedAt: new Date().toISOString(),
  };

  try {
    const query = `site:linkedin.com/in/${vanityName}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": config.serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Serper returned ${response.status} for LinkedIn profile search`);
      return null;
    }

    const data = await response.json() as {
      organic?: Array<{
        title?: string;
        snippet?: string;
        link?: string;
        sitelinks?: Array<{ title?: string; link?: string }>;
      }>;
      knowledgeGraph?: Record<string, unknown>;
    };

    // Find the matching LinkedIn profile result
    const profileResult = data.organic?.find(
      (r) => r.link?.includes(`linkedin.com/in/${vanityName}`)
    );

    if (!profileResult) {
      console.warn(`Serper: no matching result for ${vanityName}`);
      return null;
    }

    // Parse title: usually "First Last - Title - Company | LinkedIn"
    if (profileResult.title) {
      const titleParts = profileResult.title.replace(/\s*\|\s*LinkedIn\s*$/, "").split(" - ").map(s => s.trim());
      if (titleParts.length >= 1) profile.name = titleParts[0];
      if (titleParts.length >= 2) {
        profile.headline = titleParts.slice(1).join(" - ");
      }
    }

    // Parse snippet: usually contains location, experience summary, education
    if (profileResult.snippet) {
      const snippet = profileResult.snippet;

      // Location patterns: "Location · connections" or "City, State"
      const locMatch = snippet.match(/^([^·]+?)(?:\s*·|$)/);
      if (locMatch && locMatch[1]!.length < 60) {
        profile.location = locMatch[1]!.trim();
      }

      // Connection/follower counts from snippet
      const connMatch = snippet.match(/(\d[\d,]*)\s*\+?\s*connections/i);
      const followerMatch = snippet.match(/(\d[\d,]*)\s*\+?\s*followers/i);
      if (connMatch) profile.connectionCount = connMatch[1];
      if (followerMatch) profile.followerCount = followerMatch[1];

      // Experience from snippet
      const expPatterns = [
        /(?:Experience|Current):\s*(.+?)(?:\.|$)/gi,
        /(?:^|\.\s)([A-Z][^.]*(?:at|@)\s+[A-Z][^.]*)/g,
      ];
      for (const pattern of expPatterns) {
        const matches = snippet.matchAll(pattern);
        for (const match of matches) {
          const parts = match[1]!.split(/\s+(?:at|@)\s+/);
          if (parts.length >= 2) {
            profile.experience.push({ title: parts[0]!.trim(), company: parts[1]!.trim() });
          } else if (parts[0]) {
            profile.experience.push({ title: parts[0].trim() });
          }
        }
      }

      // Education from snippet
      const eduMatch = snippet.match(/(?:Education|University|College|School):\s*(.+?)(?:\.|$)/i);
      if (eduMatch) {
        profile.education.push({ school: eduMatch[1]!.trim() });
      }

      // About from snippet
      if (!profile.about && snippet.length > 50) {
        profile.about = snippet.slice(0, 500);
      }
    }

    // Sitelinks can contain section info (Experience, Education, etc.)
    if (profileResult.sitelinks) {
      for (const sl of profileResult.sitelinks) {
        if (sl.title?.toLowerCase().includes("experience") && profile.experience.length === 0) {
          profile.experience.push({ title: sl.title });
        }
      }
    }

    // Knowledge graph data (if Google shows a knowledge panel)
    const kg = data.knowledgeGraph;
    if (kg) {
      if (!profile.name && typeof kg.title === "string") profile.name = kg.title;
      if (!profile.headline && typeof kg.description === "string") profile.headline = kg.description;
      if (!profile.about && typeof kg.snippet === "string") profile.about = kg.snippet;
    }

    const hasData = profile.name || profile.headline || profile.about || profile.experience.length > 0;
    if (!hasData) return null;

    // Second Serper call: search for posts by this user
    const posts = await searchPostsViaSerper(vanityName, profile.name);
    if (posts.length > 0) {
      profile.activity = posts;
    }

    console.log(
      `LinkedIn via Serper OK for ${vanityName}: ` +
        `name=${profile.name ?? "?"}, headline=${profile.headline ?? "?"}, ` +
        `exp=${profile.experience.length}, edu=${profile.education.length}, ` +
        `posts=${profile.activity.length}`
    );
    return profile;
  } catch (error) {
    console.warn("Serper LinkedIn fallback error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Search Google via Serper for LinkedIn posts authored by this user.
 *
 * LinkedIn post URL pattern (confirmed):
 *   Profile: linkedin.com/in/{vanityName}
 *   Posts:   linkedin.com/posts/{vanityName}_{post-slug}-activity-{id}-{hash}
 *
 * The vanity name from /in/ is reused verbatim in /posts/, followed by
 * an underscore and the post slug.
 */
async function searchPostsViaSerper(
  vanityName: string,
  _displayName?: string
): Promise<LinkedInScrapedProfile["activity"]> {
  if (!config.serperApiKey) return [];

  const posts: LinkedInScrapedProfile["activity"] = [];
  const seen = new Set<string>();

  // site: is most precise but Serper free tier rate-limits it.
  // Plain URL search is the reliable fallback.
  const queries = [
    `site:linkedin.com/posts/${vanityName}`,
    `linkedin.com/posts/${vanityName}`,
  ];

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "X-API-KEY": config.serperApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 20 }),
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = (await response.json()) as {
        organic?: Array<{ title?: string; snippet?: string; link?: string }>;
        message?: string;
      };

      // Serper free tier may reject site: queries — skip to fallback
      if (data.message) continue;

      for (const r of data.organic ?? []) {
        // Only accept URLs matching /posts/{vanityName}
        if (!r.link?.includes(`/posts/${vanityName}`)) continue;
        if (seen.has(r.link)) continue;
        seen.add(r.link);

        const text = r.snippet ?? r.title ?? "";
        if (text) {
          posts.push({
            type: "post",
            text: text.slice(0, 500),
            url: r.link,
          });
        }
      }

      if (posts.length > 0) break;
    } catch {
      continue;
    }
  }

  if (posts.length > 0) {
    console.log(`Found ${posts.length} LinkedIn posts via Serper for ${vanityName}`);
  }
  return posts;
}

/**
 * Scrape a LinkedIn public profile page to extract education, experience,
 * skills, certifications, activity, and other sections the API doesn't provide.
 *
 * Fallback chain: direct fetch → Serper.dev Google search → Wayback Machine.
 * Even authwalled pages are parsed for JSON-LD and OpenGraph data.
 */
export async function scrapeLinkedInProfile(
  vanityName: string
): Promise<LinkedInScrapedProfile | null> {
  // Try direct HTTP scraping first
  const html = await fetchLinkedInPage(vanityName);
  if (html) {
    const profile = parseProfilePage(html);
    const hasData =
      profile.name ||
      profile.headline ||
      profile.about ||
      profile.experience.length > 0 ||
      profile.education.length > 0 ||
      profile.skills.length > 0;

    if (hasData) {
      console.log(
        `LinkedIn scrape OK for ${vanityName}: ` +
          `name=${profile.name ?? "?"}, ` +
          `exp=${profile.experience.length}, edu=${profile.education.length}, ` +
          `skills=${profile.skills.length}, activity=${profile.activity.length}`
      );
      return profile;
    }
    console.warn(
      `LinkedIn scrape: got HTML (${html.length} bytes) for ${vanityName} but no structured data extracted`
    );
  } else {
    console.warn(`LinkedIn scrape: no usable HTML for ${vanityName} (likely blocked with 999)`);
  }

  // Fallback: use Serper.dev to get profile data from Google search results
  const serpProfile = await scrapeViaSerper(vanityName);
  if (serpProfile) return serpProfile;

  console.warn(`LinkedIn scrape failed for ${vanityName} — all methods exhausted`);
  return null;
}

/**
 * Build a structured text summary for Cognee ingestion from scraped + API profile data.
 */
export function buildFullProfileForIngestion(
  apiProfile: Record<string, unknown>,
  scraped: LinkedInScrapedProfile | null
): string {
  const sections: string[] = [];

  const myInfo = (apiProfile.myInfo ?? apiProfile) as Record<string, unknown>;
  const person = (apiProfile.personProfile ?? {}) as Record<string, unknown>;

  const firstName = extractLocalized(myInfo.localizedFirstName) ?? extractLocalized(person.localizedFirstName);
  const lastName = extractLocalized(myInfo.localizedLastName) ?? extractLocalized(person.localizedLastName);
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const headline = extractLocalized(myInfo.localizedHeadline) ?? extractLocalized(person.localizedHeadline);
  const vanity = (person.vanityName as string) ?? (myInfo.vanityName as string);

  sections.push("## Identity");
  if (name) sections.push(`Name: ${name}`);
  if (headline) sections.push(`Headline: ${headline}`);
  if (vanity) sections.push(`LinkedIn: https://www.linkedin.com/in/${vanity}`);

  if (scraped) {
    if (scraped.location) sections.push(`Location: ${scraped.location}`);
    if (scraped.connectionCount) sections.push(`Connections: ${scraped.connectionCount}`);
    if (scraped.followerCount) sections.push(`Followers: ${scraped.followerCount}`);

    if (scraped.about) {
      sections.push("\n## About");
      sections.push(scraped.about);
    }

    if (scraped.experience.length > 0) {
      sections.push("\n## Experience");
      for (const exp of scraped.experience) {
        const parts = [exp.title, exp.company, exp.duration, exp.location]
          .filter(Boolean)
          .join(" | ");
        sections.push(`- ${parts}`);
        if (exp.description) sections.push(`  ${exp.description}`);
      }
    }

    if (scraped.education.length > 0) {
      sections.push("\n## Education");
      for (const edu of scraped.education) {
        const parts = [edu.school, edu.degree, edu.field, edu.years]
          .filter(Boolean)
          .join(" | ");
        sections.push(`- ${parts}`);
        if (edu.description) sections.push(`  ${edu.description}`);
      }
    }

    if (scraped.skills.length > 0) {
      sections.push("\n## Skills");
      sections.push(scraped.skills.join(", "));
    }

    if (scraped.certifications.length > 0) {
      sections.push("\n## Certifications");
      for (const cert of scraped.certifications) {
        sections.push(`- ${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}`);
      }
    }

    if (scraped.projects.length > 0) {
      sections.push("\n## Projects");
      for (const proj of scraped.projects) {
        sections.push(`- ${proj.name}${proj.description ? `: ${proj.description}` : ""}`);
      }
    }

    if (scraped.activity.length > 0) {
      sections.push("\n## Recent Activity");
      for (const act of scraped.activity.slice(0, 10)) {
        sections.push(`- ${act.text.slice(0, 200)}`);
      }
    }
  }

  // API-sourced posts (from LINKEDIN_ADS_LIST_POSTS)
  const posts = apiProfile.posts as Array<{ text?: string; createdAt?: string }> | undefined;
  if (posts?.length) {
    sections.push("\n## LinkedIn Posts");
    for (const post of posts.slice(0, 20)) {
      const date = post.createdAt ? ` (${post.createdAt})` : "";
      sections.push(`- ${(post.text ?? "").slice(0, 400)}${date}`);
    }
  }

  return sections.join("\n");
}

function extractLocalized(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as { localized?: Record<string, string> };
    if (obj.localized) return Object.values(obj.localized)[0];
  }
  return undefined;
}
