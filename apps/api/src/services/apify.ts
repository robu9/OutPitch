import { ApifyClient } from "apify-client";
import { config } from "../config.js";
import type { LinkedInScrapedProfile } from "./linkedin-scraper.js";

let apifyClient: ApifyClient | null = null;

function getApify(): ApifyClient | null {
  if (!config.apifyApiToken) {
    console.warn("APIFY_API_TOKEN not set — skipping Apify LinkedIn scrape");
    return null;
  }
  if (!apifyClient) {
    apifyClient = new ApifyClient({ token: config.apifyApiToken });
  }
  return apifyClient;
}

function profileUrl(vanityOrUrl: string): string {
  if (vanityOrUrl.startsWith("http")) return vanityOrUrl;
  const vanity = vanityOrUrl.replace(/^\/?(in\/)?/, "").replace(/\/$/, "");
  return `https://www.linkedin.com/in/${vanity}/`;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** Build "2000 - Present" from harvestapi's startDate/endDate objects. */
function dateRange(e: Record<string, unknown>): string | undefined {
  const start = str(obj(e.startDate).text);
  const end = str(obj(e.endDate).text);
  if (start && end) return `${start} - ${end}`;
  return start ?? end;
}

/**
 * Map a raw Apify actor item into our canonical LinkedInScrapedProfile shape.
 * Field names below match the `harvestapi/linkedin-profile-scraper` actor
 * (see APIFY_LINKEDIN_ACTOR). Common aliases from other actors are also probed
 * so a different actor still yields partial data.
 */
function mapApifyItem(item: Record<string, unknown>): LinkedInScrapedProfile {
  const experience = asArray(
    item.experience ?? item.experiences ?? item.positions
  ).map((e) => ({
    title: str(e.position ?? e.title ?? e.role),
    company: str(e.companyName ?? e.company ?? e.subtitle),
    duration: str(e.duration ?? e.dateRange ?? e.caption) ?? dateRange(e),
    location: str(e.location),
    description: str(e.description),
  }));

  const education = asArray(
    item.education ?? item.educations ?? item.schools
  ).map((ed) => ({
    school: str(ed.schoolName ?? ed.school ?? ed.title),
    degree: str(ed.degree ?? ed.degreeName ?? ed.subtitle),
    field: str(ed.fieldOfStudy ?? ed.field),
    years: str(ed.period ?? ed.years ?? ed.dateRange) ?? dateRange(ed),
    description: str(ed.description),
  }));

  const skillsRaw = item.skills ?? item.topSkills ?? item.skillsList;
  const skills: string[] = [];
  for (const s of Array.isArray(skillsRaw) ? skillsRaw : []) {
    const name =
      typeof s === "string" ? s : str(obj(s).name ?? obj(s).title ?? obj(s).skill);
    if (name?.trim()) skills.push(name.trim());
  }

  const certifications = asArray(
    item.certifications ?? item.licenses ?? item.licenseAndCertificates
  ).map((c) => ({
    name: str(c.name ?? c.title),
    issuer: str(c.issuer ?? c.authority ?? c.companyName ?? c.subtitle),
  }));

  const projects = asArray(item.projects).map((p) => ({
    name: str(p.name ?? p.title),
    description: str(p.description),
  }));

  const activity = asArray(item.activity ?? item.posts ?? item.updates).map(
    (a) => ({
      type: str(a.type) ?? "post",
      text: str(a.text ?? a.content ?? a.title ?? a.commentary) ?? "",
      url: str(a.url ?? a.linkedinUrl ?? a.link),
    })
  );

  const name =
    str(item.fullName ?? item.name) ??
    ([str(item.firstName), str(item.lastName)].filter(Boolean).join(" ") || undefined);

  const location = obj(item.location);

  return {
    name,
    headline: str(item.headline ?? item.occupation ?? item.subtitle),
    location:
      str(item.location) ??
      str(location.linkedinText) ??
      str(obj(location.parsed).text) ??
      str(item.addressWithCountry),
    connectionCount: str(item.connectionsCount ?? item.connections),
    followerCount: str(item.followerCount ?? item.followers),
    about: str(item.about ?? item.summary),
    experience,
    education,
    skills: [...new Set(skills)],
    certifications,
    activity,
    projects,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Scrape a public LinkedIn profile via an Apify actor.
 * Returns null on any failure or empty result — callers treat a miss as tolerable,
 * mirroring the previous HTML scraper behavior.
 */
export async function scrapeLinkedInViaApify(
  vanityOrUrl: string
): Promise<LinkedInScrapedProfile | null> {
  const client = getApify();
  if (!client) return null;

  const url = profileUrl(vanityOrUrl);

  try {
    // Bound the blocking wait so a slow/stuck actor run can't hang the caller
    // indefinitely. On timeout the run keeps going on Apify but we return null
    // and the caller falls back to API-only profile data.
    const run = await client.actor(config.apifyLinkedInActor).call(
      {
        queries: [url],
        profileScraperMode: config.apifyProfileMode,
      },
      { waitSecs: config.apifyWaitSecs }
    );

    if (!run?.defaultDatasetId || run.status !== "SUCCEEDED") {
      console.warn(`Apify run not ready for ${url} (status=${run?.status ?? "unknown"})`);
      return null;
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const item = items?.[0] as Record<string, unknown> | undefined;
    if (!item) {
      console.log(`Apify returned no items for ${url}`);
      return null;
    }

    return mapApifyItem(item);
  } catch (error) {
    console.warn("Apify LinkedIn scrape failed:", error);
    return null;
  }
}
