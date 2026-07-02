import { config } from "../config.js";

export type CogneeDataset = `user_${string}` | `company_${string}`;

interface RecallResult {
  content: string;
  score?: number;
}

let ready = false;
let initPromise: Promise<void> | null = null;

export function userDataset(clerkId: string): CogneeDataset {
  return `user_${clerkId}`;
}

export function companyDataset(companyId: string): CogneeDataset {
  return `company_${companyId}`;
}

function isMemoryConfigured(): boolean {
  return Boolean(config.cogneeServiceToken);
}

async function cogneeFetch(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  const authToken = token ?? config.cogneeServiceToken;
  if (authToken) {
    headers["X-Api-Key"] = authToken;
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${config.cogneeApiUrl}${path}`, {
    ...fetchOptions,
    headers,
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

function formatRecallResult(result: unknown): RecallResult[] {
  if (Array.isArray(result)) {
    return result.map((r: { text?: string; content?: string; score?: number }) => ({
      content: r.text ?? r.content ?? String(r),
      score: r.score,
    }));
  }

  if (result && typeof result === "object") {
    const obj = result as {
      result?: { data?: string | string[] };
      items?: Array<{ content?: unknown; score?: number }>;
    };

    if (obj.items?.length) {
      return obj.items.map((item) => ({
        content:
          typeof item.content === "string"
            ? item.content
            : JSON.stringify(item.content),
        score: item.score,
      }));
    }

    const data = obj.result?.data;
    if (typeof data === "string") return [{ content: data }];
    if (Array.isArray(data)) return data.map((text) => ({ content: text }));
  }

  if (typeof result === "string") return [{ content: result }];
  return [{ content: JSON.stringify(result) }];
}

export async function initCognee(): Promise<void> {
  if (ready) return;
  if (!isMemoryConfigured()) {
    console.warn("Warning: Cognee memory disabled — set COGNEE_SERVICE_TOKEN in .env");
    return;
  }

  try {
    const health = await fetch(`${config.cogneeApiUrl}/health`, {
      headers: { "X-Api-Key": config.cogneeServiceToken },
    });
    if (!health.ok) {
      console.warn(`Cognee API unreachable at ${config.cogneeApiUrl} (${health.status})`);
      return;
    }
    ready = true;
    console.log(`Cognee memory connected (${config.cogneeApiUrl})`);
  } catch (error) {
    console.warn("Cognee API unreachable:", error);
  }
}

async function ensureReady(): Promise<boolean> {
  if (!isMemoryConfigured()) return false;
  if (!initPromise) initPromise = initCognee();
  await initPromise;
  return ready;
}

export async function provisionCogneeUser(clerkId: string, email?: string) {
  if (!(await ensureReady())) {
    return { id: clerkId, token: undefined };
  }

  try {
    const result = await cogneeFetch("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  if (!(await ensureReady())) return null;

  try {
    const form = new FormData();
    form.append("data", new Blob([content], { type: "text/plain" }), "content.txt");
    form.append("datasetName", options.dataset);
    if (options.sessionId) form.append("session_id", options.sessionId);

    return cogneeFetch("/api/v1/remember", {
      method: "POST",
      token: options.token,
      body: form,
    });
  } catch (error) {
    console.warn("Cognee remember failed:", error);
    return null;
  }
}

export async function recall(
  query: string,
  options: {
    token?: string;
    datasets: string[];
    sessionId?: string;
    topK?: number;
  }
): Promise<RecallResult[]> {
  if (!(await ensureReady())) return [];

  try {
    const result = await cogneeFetch("/api/v1/recall", {
      method: "POST",
      token: options.token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        datasets: options.datasets,
        session_id: options.sessionId,
        top_k: options.topK ?? 10,
      }),
    });
    return formatRecallResult(result);
  } catch (error) {
    console.warn("Cognee recall failed:", error);
    return [];
  }
}

export async function improve(
  feedback: string,
  options: { token?: string; dataset: string }
) {
  if (!(await ensureReady())) return null;

  try {
    await remember(`User feedback: ${feedback}`, {
      dataset: options.dataset,
      token: options.token,
    });

    return cogneeFetch("/api/v1/improve", {
      method: "POST",
      token: options.token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetName: options.dataset, feedback }),
    });
  } catch (error) {
    console.warn("Cognee improve failed:", error);
    return null;
  }
}

export async function forget(options: {
  token?: string;
  dataset: string;
  query?: string;
}) {
  if (!(await ensureReady())) return null;

  try {
    if (options.query) {
      await remember(`User requested to forget: ${options.query}`, {
        dataset: options.dataset,
        token: options.token,
      });
      return improve(`Forget topic: ${options.query}`, {
        dataset: options.dataset,
        token: options.token,
      });
    }

    return cogneeFetch("/api/v1/forget", {
      method: "POST",
      token: options.token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetName: options.dataset }),
    });
  } catch (error) {
    console.warn("Cognee forget failed:", error);
    return null;
  }
}

export async function ingestUserProfile(
  clerkId: string,
  profile: Record<string, unknown>,
  token?: string
) {
  const dataset = userDataset(clerkId);
  const content = `User profile: ${JSON.stringify(profile, null, 2)}`;
  return remember(content, { dataset, token });
}

export async function ingestCompanyContext(
  companyId: string,
  context: string,
  token?: string
) {
  const dataset = companyDataset(companyId);
  return remember(context, { dataset, token });
}

export async function recallUserAndCompany(
  clerkId: string,
  companyId: string | undefined,
  query: string,
  token?: string
) {
  const datasets = [userDataset(clerkId)];
  if (companyId) datasets.push(companyDataset(companyId));
  return recall(query, { datasets, token });
}

export function isCogneeReady(): boolean {
  return ready;
}

export function getCogneeBackend(): "http" | "disabled" {
  return ready ? "http" : "disabled";
}
