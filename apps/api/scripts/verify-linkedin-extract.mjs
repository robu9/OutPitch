/**
 * Verify LinkedIn extraction without Cognee or full app server.
 * Usage: node apps/api/scripts/verify-linkedin-extract.mjs [vanityName]
 */
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
dotenv.config({ path: resolve(apiRoot, "../../.env") });
dotenv.config({ path: resolve(apiRoot, ".env") });

const vanityName = process.argv[2] ?? "anushayjain";
const serperKey = process.env.SERPER_API_KEY ?? "";

console.log(`\n=== Verify LinkedIn extraction: ${vanityName} ===\n`);

// 1. Serper.dev
console.log("1. Serper.dev search...");
if (!serperKey) {
  console.log("   SKIP — no SERPER_API_KEY in env\n");
} else {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `site:linkedin.com/in/${vanityName}`, num: 5 }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`   FAIL HTTP ${res.status}:`, JSON.stringify(data).slice(0, 200));
    } else {
      const hit = data.organic?.find((r) => r.link?.includes(`linkedin.com/in/${vanityName}`));
      console.log(`   OK — ${data.organic?.length ?? 0} results`);
      if (hit) {
        console.log(`   Profile: ${hit.title}`);
        console.log(`   Snippet: ${(hit.snippet ?? "").slice(0, 180)}...`);
      } else {
        console.log("   WARN — no exact profile match in organic results");
      }
    }
  } catch (e) {
    console.log(`   FAIL: ${e.message}`);
  }
  console.log();
}

// 2. Import actual scraper (tsx would be better for TS; use dynamic import of compiled path via tsx)
console.log("2. scrapeLinkedInProfile() via tsx...");
console.log("   (run with: npx tsx apps/api/scripts/verify-linkedin-extract.ts)\n");
