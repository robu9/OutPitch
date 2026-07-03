/**
 * One-off audit: verify all company contact emails in DB (no Apollo, no search).
 * Usage: npx tsx scripts/verify-db-emails.ts [--apply]
 *   --apply  Clear email on contacts that fail verification (default: dry-run)
 */
import "../src/load-env.js";
import { prisma } from "@outpitch/db";
import { verifyEmailExists } from "../src/services/email-verifier.js";

const apply = process.argv.includes("--apply");

async function main() {
  const contacts = await prisma.companyContact.findMany({
    where: { email: { not: null } },
    include: { company: { select: { name: true, domain: true } } },
    orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
  });

  if (contacts.length === 0) {
    console.log("No contacts with emails in the database.");
    return;
  }

  console.log(`\nVerifying ${contacts.length} contact email(s)...\n`);
  console.log(`Mode: ${apply ? "APPLY (will clear invalid emails)" : "DRY RUN (report only)"}\n`);
  console.log("-".repeat(100));

  const valid: typeof contacts = [];
  const invalid: Array<(typeof contacts)[number] & { reason: string }> = [];

  for (const contact of contacts) {
    const email = contact.email!;
    process.stdout.write(`Checking ${email} (${contact.company.name})... `);

    const result = await verifyEmailExists(email);

    if (result.valid) {
      valid.push(contact);
      console.log(`VALID (${result.deliverability}${result.smtpCode ? `, SMTP ${result.smtpCode}` : ""})`);
    } else {
      const reason = result.reason ?? result.deliverability;
      invalid.push({ ...contact, reason });
      console.log(`INVALID — ${reason}${result.smtpCode ? ` (SMTP ${result.smtpCode})` : ""}`);
    }
  }

  console.log("-".repeat(100));
  console.log(`\nSummary:`);
  console.log(`  Valid:   ${valid.length}`);
  console.log(`  Invalid: ${invalid.length}`);
  console.log(`  Total:   ${contacts.length}`);

  if (invalid.length > 0) {
    console.log(`\nInvalid emails:`);
    for (const c of invalid) {
      console.log(`  - ${c.email} | ${c.name} @ ${c.company.name} (${c.company.domain}) | ${c.reason}`);
    }
  }

  if (valid.length > 0) {
    console.log(`\nValid emails:`);
    for (const c of valid) {
      console.log(`  + ${c.email} | ${c.name} @ ${c.company.name}`);
    }
  }

  if (apply && invalid.length > 0) {
    const ids = invalid.map((c) => c.id);
    const updated = await prisma.companyContact.updateMany({
      where: { id: { in: ids } },
      data: { email: null, confidence: 0 },
    });
    console.log(`\nCleared email on ${updated.count} contact(s).`);
  } else if (!apply && invalid.length > 0) {
    console.log(`\nRe-run with --apply to clear invalid emails from the database.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
