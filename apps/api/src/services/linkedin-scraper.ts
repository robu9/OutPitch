import * as cheerio from "cheerio";

const FETCH_TIMEOUT = 15000;

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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
];

async function fetchLinkedInPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
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
      },
    });

    if (!response.ok) {
      console.warn(`LinkedIn scrape HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();

    // LinkedIn authwall redirect detection
    if (html.includes("/authwall") || html.includes("auth_wall")) {
      console.warn("LinkedIn returned authwall — trying Google cache fallback");
      return fetchGoogleCache(url);
    }

    return html;
  } catch (err) {
    console.warn("LinkedIn fetch error:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGoogleCache(originalUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(originalUrl)}`;
    const response = await fetch(cacheUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENTS[0],
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

  // Name and headline from top card
  const topCard = $(".top-card-layout, .pv-top-card, [data-section='profile']");
  profile.name = cleanText(
    topCard.find("h1").first().text() ||
      $('h1[class*="name"]').first().text() ||
      $("h1").first().text()
  ) || undefined;

  profile.headline = cleanText(
    topCard.find("h2").first().text() ||
      $('[class*="headline"]').first().text() ||
      $("h2").first().text()
  ) || undefined;

  // Location
  const locationEl = $('[class*="location"], [class*="top-card"] .text-body-small').first();
  profile.location = cleanText(locationEl.text()) || undefined;

  // Connections/followers from subline
  const subline = $(".top-card-layout__first-subline, [class*=\"connections\"]").text();
  const connMatch = subline.match(/(\d[\d,]*)\s*connections/i);
  const followerMatch = subline.match(/(\d[\d,]*)\s*followers/i);
  if (connMatch) profile.connectionCount = connMatch[1];
  if (followerMatch) profile.followerCount = followerMatch[1];

  // About section
  const aboutSection = $(
    '[class*="about"] [class*="text-body"], ' +
      '#about ~ .display-flex, ' +
      'section.summary .core-section-container__content, ' +
      '[data-section="summary"] p'
  );
  profile.about = cleanText(aboutSection.text()) || undefined;

  // Experience section
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
      const location = cleanText(
        $el.find('[class*="location"]').first().text()
      );
      const description = cleanText(
        $el.find('[class*="description"], .show-more-less-text').first().text()
      );
      if (title || company) {
        profile.experience.push({ title, company, duration, location, description });
      }
    }
  );

  // Education section
  $('section#education li, [data-section="education"] li, .education-section li').each(
    (_, el) => {
      const $el = $(el);
      const school = cleanText($el.find("h3, [class*='name']").first().text());
      const degree = cleanText($el.find("[class*='degree'], [class*='subtitle']").first().text());
      const field = cleanText($el.find("[class*='field']").first().text());
      const years = cleanText($el.find("[class*='date'], .date-range").first().text());
      const description = cleanText($el.find("[class*='description']").first().text());
      if (school) {
        profile.education.push({ school, degree, field, years, description });
      }
    }
  );

  // Skills section
  $('section#skills li, [data-section="skills"] li, .skills-section li').each(
    (_, el) => {
      const skill = cleanText($(el).find("h3, [class*='name'], span").first().text());
      if (skill && skill.length < 100) {
        profile.skills.push(skill);
      }
    }
  );

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

  // Activity (posts they authored or interacted with)
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

  // Fallback: parse structured data (JSON-LD) if present
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      if (data["@type"] === "Person") {
        if (!profile.name && data.name) profile.name = data.name;
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
              title: j.member?.jobTitle,
              company: j.name,
            });
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  return profile;
}

/**
 * Scrape a LinkedIn public profile page to extract education, experience,
 * skills, certifications, activity, and other sections the API doesn't provide.
 */
export async function scrapeLinkedInProfile(
  vanityName: string
): Promise<LinkedInScrapedProfile | null> {
  // Try multiple URL variants
  const urls = [
    `https://www.linkedin.com/in/${vanityName}`,
    `https://in.linkedin.com/in/${vanityName}`,
  ];

  let html: string | null = null;
  for (const url of urls) {
    html = await fetchLinkedInPage(url);
    if (html) break;
  }

  if (!html) {
    console.warn(`LinkedIn scrape failed for ${vanityName} — all attempts exhausted`);
    return null;
  }

  const profile = parseProfilePage(html);
  return profile;
}

/**
 * Build a structured text summary for Cognee ingestion from scraped + API profile data.
 */
export function buildFullProfileForIngestion(
  apiProfile: Record<string, unknown>,
  scraped: LinkedInScrapedProfile | null
): string {
  const sections: string[] = [];

  // API data (basic identity)
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
