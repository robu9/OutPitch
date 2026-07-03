import { config } from "../config.js";
import { guessEmailPatterns } from "./crawler.js";

interface ApolloPerson {
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  linkedin_url?: string;
}

async function apolloRequest(path: string, body: Record<string, unknown>) {
  if (!config.apolloApiKey) {
    return null;
  }

  const response = await fetch(`https://api.apollo.io/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apolloApiKey,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.warn(`Apollo API error: ${response.status}`);
    return null;
  }

  return response.json();
}

export async function enrichPerson(params: {
  firstName?: string;
  lastName?: string;
  domain?: string;
  linkedinUrl?: string;
  email?: string;
}): Promise<{ email?: string; title?: string; confidence: number } | null> {
  const result = await apolloRequest("/people/match", {
    first_name: params.firstName,
    last_name: params.lastName,
    domain: params.domain,
    linkedin_url: params.linkedinUrl,
    email: params.email,
    reveal_personal_emails: false,
  });

  if (!result) return null;

  const person = (result as { person?: ApolloPerson }).person;
  if (!person?.email) return null;

  return {
    email: person.email,
    title: person.title,
    confidence: 85,
  };
}

export async function bulkEnrich(
  people: Array<{ firstName?: string; lastName?: string; domain?: string }>
) {
  const batch = people.slice(0, 10);
  const result = await apolloRequest("/people/bulk_match", {
    details: batch.map((p) => ({
      first_name: p.firstName,
      last_name: p.lastName,
      domain: p.domain,
    })),
    reveal_personal_emails: false,
  });

  if (!result) return [];

  const matches = (result as { matches?: ApolloPerson[] }).matches ?? [];
  return matches.map((p) => ({
    email: p.email,
    title: p.title,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
    confidence: p.email ? 85 : 0,
  }));
}

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

export async function resolveEmailViaApollo(params: {
  name: string;
  domain: string;
  linkedinUrl?: string;
}): Promise<{ email: string; source: string; confidence: number; title?: string } | null> {
  const nameParts = params.name.split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const apollo = await enrichPerson({
    firstName,
    lastName,
    domain: params.domain,
    linkedinUrl: params.linkedinUrl,
  });

  if (!apollo?.email) return null;

  return {
    email: apollo.email,
    source: "apollo",
    confidence: apollo.confidence,
    title: apollo.title,
  };
}
