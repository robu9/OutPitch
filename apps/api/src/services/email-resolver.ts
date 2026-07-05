import { guessEmailPatterns } from "./crawler.js";

export async function resolveEmail(params: {
  name: string;
  domain: string;
  crawledEmails: string[];
  title?: string;
  linkedinUrl?: string;
}): Promise<{ email: string; source: string; confidence: number } | null> {
  const nameParts = params.name.split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  for (const email of params.crawledEmails) {
    const local = email.split("@")[0].toLowerCase();
    if (
      local.includes(firstName.toLowerCase()) ||
      local.includes(lastName.toLowerCase().replace(" ", ""))
    ) {
      return { email, source: "crawl", confidence: 90 };
    }
  }

  if (params.crawledEmails.length > 0) {
    const patterns = guessEmailPatterns(
      firstName,
      lastName,
      params.domain,
      params.crawledEmails
    );
    if (patterns[0]) {
      return { email: patterns[0], source: "pattern", confidence: 60 };
    }
  }

  const patterns = guessEmailPatterns(firstName, lastName, params.domain);
  if (patterns.length > 0) {
    return { email: patterns[0], source: "pattern", confidence: 40 };
  }

  return null;
}
