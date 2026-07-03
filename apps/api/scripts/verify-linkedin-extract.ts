/**
 * Verify LinkedIn extraction using the real scraper module.
 * Usage: npx tsx apps/api/scripts/verify-linkedin-extract.ts [vanityName]
 */
import "../src/load-env.js";
import { scrapeLinkedInProfile } from "../src/services/linkedin-scraper.js";

const vanityName = process.argv[2] ?? "anushayjain";

async function main() {
  console.log(`\n=== scrapeLinkedInProfile("${vanityName}") ===\n`);

  const profile = await scrapeLinkedInProfile(vanityName);

  if (!profile) {
    console.log("RESULT: null (extraction failed)\n");
    process.exit(1);
  }

  console.log("RESULT: success\n");
  console.log(JSON.stringify(
    {
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      connectionCount: profile.connectionCount,
      about: profile.about?.slice(0, 200),
      experienceCount: profile.experience.length,
      educationCount: profile.education.length,
      skillsCount: profile.skills.length,
      activityCount: profile.activity.length,
      experience: profile.experience.slice(0, 3),
      education: profile.education.slice(0, 2),
      skills: profile.skills.slice(0, 10),
    },
    null,
    2
  ));
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
