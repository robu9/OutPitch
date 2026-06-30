import { config } from "../config.js";

export type CogneeDataset = `user_${string}` | `company_${string}`;

interface CogneeRequestOptions {
  token?: string;
  dataset?: string;
  datasets?: string[];
}

async function cogneeFetch(
  path: string,
  options: RequestInit & CogneeRequestOptions = {}
) {
  const { token, dataset, datasets, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const authToken = token ?? config.cogneeServiceToken;
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const body = fetchOptions.body
    ? JSON.parse(fetchOptions.body as string)
    : {};

  if (dataset) body.dataset = dataset;
  if (datasets) body.datasets = datasets;

  const response = await fetch(`${config.cogneeApiUrl}${path}`, {
    ...fetchOptions,
    headers,
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : fetchOptions.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cognee API error ${response.status}: ${text}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export function userDataset(clerkId: string): CogneeDataset {
  return `user_${clerkId}`;
}

export function companyDataset(companyId: string): CogneeDataset {
  return `company_${companyId}`;
}

export async function provisionCogneeUser(clerkId: string, email?: string) {
  try {
    const result = await cogneeFetch("/api/v1/users", {
      method: "POST",
      body: JSON.stringify({
        email: email ?? `${clerkId}@outpitch.local`,
        username: clerkId,
      }),
    });
    return result as { id: string; token?: string };
  } catch {
    return { id: clerkId, token: config.cogneeServiceToken };
  }
}

export async function remember(
  content: string,
  options: { token?: string; dataset: string; sessionId?: string }
) {
  return cogneeFetch("/api/v1/remember", {
    method: "POST",
    token: options.token,
    dataset: options.dataset,
    body: JSON.stringify({
      data: content,
      session_id: options.sessionId,
    }),
  });
}

export async function recall(
  query: string,
  options: { token?: string; datasets: string[]; sessionId?: string; topK?: number }
) {
  const result = await cogneeFetch("/api/v1/recall", {
    method: "POST",
    token: options.token,
    datasets: options.datasets,
    body: JSON.stringify({
      query,
      session_id: options.sessionId,
      top_k: options.topK ?? 10,
    }),
  });

  if (Array.isArray(result)) {
    return result.map((r: { text?: string; content?: string; score?: number }) => ({
      content: r.text ?? r.content ?? String(r),
      score: r.score,
    }));
  }
  return [{ content: String(result) }];
}

export async function improve(
  feedback: string,
  options: { token?: string; dataset: string }
) {
  return cogneeFetch("/api/v1/improve", {
    method: "POST",
    token: options.token,
    dataset: options.dataset,
    body: JSON.stringify({ feedback }),
  });
}

export async function forget(
  options: { token?: string; dataset: string; query?: string }
) {
  return cogneeFetch("/api/v1/forget", {
    method: "POST",
    token: options.token,
    dataset: options.dataset,
    body: JSON.stringify({ query: options.query }),
  });
}

export async function ingestUserProfile(
  clerkId: string,
  profile: Record<string, unknown>,
  token?: string
) {
  const dataset = userDataset(clerkId);
  const content = `User profile: ${JSON.stringify(profile, null, 2)}`;
  return remember(content, { token, dataset });
}

export async function ingestCompanyContext(
  companyId: string,
  context: string,
  token?: string
) {
  const dataset = companyDataset(companyId);
  return remember(context, { token, dataset });
}

export async function recallUserAndCompany(
  clerkId: string,
  companyId: string | undefined,
  query: string,
  token?: string
) {
  const datasets = [userDataset(clerkId)];
  if (companyId) datasets.push(companyDataset(companyId));
  return recall(query, { token, datasets });
}
