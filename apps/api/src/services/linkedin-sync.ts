import { AppError } from "../middleware/error.js";
import {
  getClerkUser,
  extractLinkedInVanityFromClerkUser,
  extractLinkedInUrlFromClerkUser,
} from "./clerk-linkedin.js";
import type { LinkedInScrapedProfile } from "./linkedin-scraper.js";

function mergeScrapedIntoProfile(
  profile: Record<string, unknown>,
  scraped: LinkedInScrapedProfile
) {
  profile.scraped = scraped;
  if (scraped.location && !profile.location) profile.location = scraped.location;
  if (scraped.about && !profile.about) profile.about = scraped.about;
  if (scraped.experience.length > 0 && !profile.experience) profile.experience = scraped.experience;
  if (scraped.education.length > 0 && !profile.education) profile.education = scraped.education;
  if (scraped.skills.length > 0 && !profile.skills) profile.skills = scraped.skills;
  if (scraped.certifications.length > 0) profile.certifications = scraped.certifications;
  if (scraped.projects.length > 0) profile.projects = scraped.projects;
  if (scraped.activity.length > 0 && !profile.activity) profile.activity = scraped.activity;
  if (scraped.headline && !profile.localizedHeadline) profile.localizedHeadline = scraped.headline;
  if (scraped.name && !profile.localizedFirstName) {
    const [first, ...rest] = scraped.name.split(" ");
    profile.localizedFirstName = first;
    if (rest.length) profile.localizedLastName = rest.join(" ");
  }
}

/**
 * Build a profile object from the user's Clerk LinkedIn OAuth account,
 * then enrich it via Apify (same scrape path as the old Composio flow).
 */
export async function getLinkedInProfileFromClerk(
  clerkId: string
): Promise<Record<string, unknown> | null> {
  const user = await getClerkUser(clerkId);
  if (!user) return null;

  const vanity = extractLinkedInVanityFromClerkUser(user);
  if (!vanity) return null;

  const profile: Record<string, unknown> = {
    vanityName: vanity,
    linkedinUrl: extractLinkedInUrlFromClerkUser(user),
    source: "clerk",
    clerkLinkedIn: true,
  };

  if (user.first_name) profile.localizedFirstName = user.first_name;
  if (user.last_name) profile.localizedLastName = user.last_name;

  try {
    const { scrapeLinkedInViaApify } = await import("./apify.js");
    const scraped = await scrapeLinkedInViaApify(vanity);
    if (scraped) {
      mergeScrapedIntoProfile(profile, scraped);
    } else {
      console.log(
        `LinkedIn scrape returned null for ${vanity} — profile will have Clerk identity only.`
      );
    }
  } catch (error) {
    console.warn("LinkedIn scrape failed:", error);
  }

  profile.syncedAt = new Date().toISOString();
  return profile;
}

export async function getLinkedInProfileFromClerkWithRetry(
  clerkId: string,
  attempts = 2,
  delayMs = 1500
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const profile = await getLinkedInProfileFromClerk(clerkId);
      if (profile) return profile;
    } catch (error) {
      console.warn(`Clerk LinkedIn profile attempt ${attempt}/${attempts} failed:`, error);
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export async function requireClerkLinkedInAccount(clerkId: string) {
  const user = await getClerkUser(clerkId);
  if (!user || !extractLinkedInVanityFromClerkUser(user)) {
    throw new AppError(
      400,
      "Sign in with LinkedIn to import your profile.",
      "LINKEDIN_NOT_CONNECTED"
    );
  }
  return user;
}
