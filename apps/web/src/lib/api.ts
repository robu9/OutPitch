const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { clerkUserId?: string } = {}
): Promise<T> {
  const { clerkUserId, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (clerkUserId) {
    headers["x-clerk-user-id"] = clerkUserId;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `API error ${response.status}`);
  }

  return response.json();
}

export interface OutreachDraft {
  campaignId: string;
  to: string;
  subject: string;
  body: string;
  contactName?: string;
  companyName?: string;
  companyId?: string;
}

export async function streamChat(
  message: string,
  clerkUserId: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  options: {
    sessionId?: string;
    onSession?: (sessionId: string, title: string) => void;
    onJob?: (jobId: string) => void;
    onDraft?: (draft: OutreachDraft) => void;
  } = {}
) {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-clerk-user-id": clerkUserId,
      },
      body: JSON.stringify({ message, sessionId: options.sessionId }),
    });

    if (!response.ok || !response.body) {
      onError("Failed to connect to chat. Is the server running?");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "session") options.onSession?.(data.sessionId, data.title);
            if (data.type === "job") options.onJob?.(data.jobId);
            if (data.type === "draft") options.onDraft?.(data.draft);
            if (data.type === "chunk") onChunk(data.content);
            if (data.type === "done") onDone();
            if (data.type === "error") onError(data.content);
          } catch {
            // skip malformed SSE
          }
        }
      }
    }
  } catch (err) {
    // Network error, CORS failure, mid-stream disconnect — surface it so the UI
    // can recover instead of hanging on a permanent "streaming" state.
    onError(err instanceof Error ? err.message : "Connection to chat failed");
  }
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface PipelineContact {
  id?: string;
  name: string;
  title?: string;
  email?: string;
  source?: string;
  confidence?: number;
}

export interface PipelineCompany {
  id: string;
  name: string;
  domain: string;
  description?: string;
  matchScore: number;
  matchReason?: string;
  contacts?: PipelineContact[];
  sourceUrl?: string;
}

export interface PipelineStatus {
  jobId: string;
  status: "queued" | "searching" | "crawling" | "enriching" | "completed" | "failed" | string;
  progress: number;
  message?: string | null;
  companies?: PipelineCompany[] | null;
  error?: string | null;
}

export function fetchPipelineStatus(jobId: string, clerkUserId: string) {
  return apiFetch<PipelineStatus>(`/api/chat/pipeline/${jobId}`, { clerkUserId });
}

export function sendOutreachEmail(
  clerkUserId: string,
  payload: {
    to: string;
    subject: string;
    body: string;
    campaignId?: string;
    companyId?: string;
  }
) {
  return apiFetch<{ success: boolean; campaignId: string }>("/api/outreach/send", {
    method: "POST",
    clerkUserId,
    body: JSON.stringify(payload),
  });
}
