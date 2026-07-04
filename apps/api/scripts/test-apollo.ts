/**
 * Diagnose Apollo API auth and people/match request format.
 * Usage: npx tsx scripts/test-apollo.ts
 */
import "../src/load-env.js";
import { config } from "../src/config.js";
import {
  isApolloEnrichmentAvailable,
  getApolloEnrichmentStatus,
  enrichPerson,
} from "../src/services/email-resolver.js";

const key = config.apolloApiKey;

async function test(name: string, url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const text = await res.text();
  console.log(`\n--- ${name} ---`);
  console.log("Status:", res.status);
  console.log("Body:", text.slice(0, 600));
}

async function main() {
  console.log("Key configured:", Boolean(key));
  console.log("Key length:", key?.length ?? 0);

  if (!key) {
    console.error("APOLLO_API_KEY is not set");
    process.exit(1);
  }

  await test("health GET", "https://api.apollo.io/api/v1/auth/health", {
    headers: { "x-api-key": key, "Cache-Control": "no-cache" },
  });

  const qs = new URLSearchParams({
    first_name: "Tim",
    last_name: "Zheng",
    domain: "apollo.io",
    reveal_personal_emails: "false",
  });
  await test("match query params (docs)", `https://api.apollo.io/api/v1/people/match?${qs}`, {
    method: "POST",
    headers: { "x-api-key": key, "Cache-Control": "no-cache" },
  });

  const available = await isApolloEnrichmentAvailable();
  const status = getApolloEnrichmentStatus();
  console.log("\n--- resolver status ---");
  console.log("enrichment available:", available);
  console.log("status:", status);

  if (available) {
    const enriched = await enrichPerson({
      firstName: "Tim",
      lastName: "Zheng",
      domain: "apollo.io",
    });
    console.log("\n--- enrichPerson ---");
    console.log(enriched);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
