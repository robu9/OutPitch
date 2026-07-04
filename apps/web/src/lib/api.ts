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

export async function streamChat(
  message: string,
  clerkUserId: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  options: { sessionId?: string; onSession?: (sessionId: string, title: string) => void } = {}
) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-clerk-user-id": clerkUserId,
    },
    body: JSON.stringify({ message, sessionId: options.sessionId }),
  });

  if (!response.ok || !response.body) {
    onError("Failed to connect to chat");
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
          if (data.type === "chunk") onChunk(data.content);
          if (data.type === "done") onDone();
          if (data.type === "error") onError(data.content);
        } catch {
          // skip malformed SSE
        }
      }
    }
  }
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}
