import { config } from "../config.js";
import { guessEmailPatterns } from "./crawler.js";

interface ApolloPerson {
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  linkedin_url?: string;
}

interface ApolloErrorBody {
  error?: string;
  error_code?: string;
}

type ApolloRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; errorCode?: string; message: string };

let enrichmentAccessCache: boolean | null = null;
let enrichmentUnavailableReason: string | null = null;

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  return qs.toString();
}

function markEnrichmentUnavailable(message: string) {
  enrichmentAccessCache = false;
  enrichmentUnavailableReason = message;
}

async function apolloRequest<T>(
  path: string,
  options: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  } = {}
): Promise<ApolloRequestResult<T>> {
  if (!config.apolloApiKey) {
    return { ok: false, status: 0, message: "APOLLO_API_KEY is not configured" };
  }

  if (enrichmentAccessCache === false) {
    return {
      ok: false,
      status: 403,
      errorCode: "API_INACCESSIBLE",
      message: enrichmentUnavailableReason ?? "Apollo enrichment is unavailable",
    };
  }

  const queryString = options.query ? buildQueryString(options.query) : "";
  const url = `${APOLLO_BASE}${path}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": config.apolloApiKey,
      "Cache-Control": "no-cache",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let parsed: (ApolloErrorBody & T) | null = null;
  try {
    parsed = JSON.parse(text) as ApolloErrorBody & T;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = parsed?.error ?? `Apollo API error ${response.status}`;
    const errorCode = parsed?.error_code;

    if (response.status === 403 && errorCode === "API_INACCESSIBLE") {
      markEnrichmentUnavailable(message);
    }

    console.warn(`Apollo API error (${response.status}${errorCode ? `, ${errorCode}` : ""}): ${message}`);
    return { ok: false, status: response.status, errorCode, message };
  }

  enrichmentAccessCache = true;
  enrichmentUnavailableReason = null;
  return { ok: true, data: (parsed ?? ({} as T)) as T };
}

/** Probe whether people enrichment is enabled for the current Apollo plan/key. */
export async function isApolloEnrichmentAvailable(): Promise<boolean> {
  if (enrichmentAccessCache !== null) return enrichmentAccessCache;
  if (!config.apolloApiKey) return false;

  const health = await fetch(`${APOLLO_BASE}/auth/health`, {
    headers: { "x-api-key": config.apolloApiKey, "Cache-Control": "no-cache" },
  });
  if (!health.ok) {
    markEnrichmentUnavailable("Apollo API key failed health check");
    return false;
  }

  const qs = buildQueryString({ first_name: "test", domain: "example.com" });
  const probe = await fetch(`${APOLLO_BASE}/people/match?${qs}`, {
    method: "POST",
    headers: { "x-api-key": config.apolloApiKey, "Cache-Control": "no-cache" },
  });

  if (probe.status === 403) {
    const body = (await probe.json().catch(() => ({}))) as ApolloErrorBody;
    if (body.error_code === "API_INACCESSIBLE") {
      markEnrichmentUnavailable(
        body.error ??
          "People enrichment requires a paid Apollo plan with API access enabled"
      );
      return false;
    }
  }

  enrichmentAccessCache = probe.ok;
  if (!probe.ok) {
    enrichmentUnavailableReason = `Apollo people/match probe failed with status ${probe.status}`;
  }
  return enrichmentAccessCache;
}

export function getApolloEnrichmentStatus(): {
  configured: boolean;
  available: boolean | null;
  reason: string | null;
} {
  return {
    configured: Boolean(config.apolloApiKey),
    available: enrichmentAccessCache,
    reason: enrichmentUnavailableReason,
  };
}

export async function enrichPerson(params: {
  firstName?: string;
  lastName?: string;
  domain?: string;
  linkedinUrl?: string;
  email?: string;
}): Promise<{ email?: string; title?: string; confidence: number } | null> {
  const result = await apolloRequest<{ person?: ApolloPerson }>("/people/match", {
    query: {
      first_name: params.firstName,
      last_name: params.lastName,
      domain: params.domain,
      linkedin_url: params.linkedinUrl,
      email: params.email,
      reveal_personal_emails: false,
    },
  });

  if (!result.ok) return null;

  const person = result.data.person;
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
  const result = await apolloRequest<{ matches?: ApolloPerson[] }>("/people/bulk_match", {
    query: { reveal_personal_emails: false },
    body: {
      details: batch.map((p) => ({
        first_name: p.firstName,
        last_name: p.lastName,
        domain: p.domain,
      })),
    },
  });

  if (!result.ok) return [];

  const matches = result.data.matches ?? [];
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
  if (!(await isApolloEnrichmentAvailable())) return null;

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
