"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { streamChat, apiFetch, type ChatSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Send, Plus, Trash2, MessageSquare } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Find Series A–C startups hiring frontend engineers",
  "Show my company pipeline ranked by fit",
  "Draft outreach to a VP of Engineering at Retool",
  "What does Cognee remember about my preferences?",
];

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return [];
    const data = await apiFetch<{ sessions: ChatSession[] }>("/api/chat/sessions", {
      clerkUserId: user.id,
    }).catch(() => ({ sessions: [] as ChatSession[] }));
    setSessions(data.sessions);
    return data.sessions;
  }, [user]);

  const loadHistory = useCallback(
    async (sid: string | null) => {
      if (!user) return;
      setHistoryLoaded(false);
      const query = sid ? `?sessionId=${encodeURIComponent(sid)}` : "";
      const data = await apiFetch<{ messages: Array<{ id: string; role: string; content: string }> }>(
        `/api/chat/history${query}`,
        { clerkUserId: user.id }
      ).catch(() => ({ messages: [] as Array<{ id: string; role: string; content: string }> }));
      setMessages(
        data.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))
      );
      setHistoryLoaded(true);
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await loadSessions();
      if (list.length > 0) {
        setSessionId(list[0].id);
        await loadHistory(list[0].id);
      } else {
        setSessionId(null);
        setMessages([]);
        setHistoryLoaded(true);
      }
    })();
  }, [user, loadSessions, loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function newChat() {
    if (streaming) return;
    setSessionId(null);
    setMessages([]);
    setInput("");
    setHistoryLoaded(true);
    inputRef.current?.focus();
  }

  async function selectSession(id: string) {
    if (streaming || id === sessionId) return;
    setSessionId(id);
    await loadHistory(id);
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user || streaming) return;
    await apiFetch(`/api/chat/sessions/${id}`, {
      method: "DELETE",
      clerkUserId: user.id,
    }).catch(() => {});
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (id === sessionId) {
      if (remaining.length > 0) {
        setSessionId(remaining[0].id);
        await loadHistory(remaining[0].id);
      } else {
        newChat();
      }
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || !user || streaming) return;

    const userMessage = input.trim();
    setInput("");
    setStreaming(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    await streamChat(
      userMessage,
      user.id,
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      },
      () => {
        setStreaming(false);
        loadSessions();
      },
      (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${error}` } : m
          )
        );
        setStreaming(false);
      },
      {
        sessionId: sessionId ?? undefined,
        onSession: (sid) => {
          if (!sessionId) setSessionId(sid);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const sessionSidebar = (
    <>
      <div className="p-3">
        <Button
          type="button"
          onClick={newChat}
          disabled={streaming}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </Button>
      </div>
      <div className="px-4 pb-2 text-xs text-text-secondary">History</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-xs text-text-secondary">
            No conversations yet.
          </p>
        ) : (
          sessions.map((s) => {
            const active = s.id === sessionId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSession(s.id)}
                className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  active
                    ? "bg-bg-surface text-foreground"
                    : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{s.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-foreground transition-opacity shrink-0"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </span>
              </button>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <AppShell sidebar={sessionSidebar}>
      <PageHeader
        title="Chat"
        description="Discover companies, draft outreach, and refine your search"
        action={
          <Link href="/companies">
            <Button variant="outline" size="sm">
              View companies
            </Button>
          </Link>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 py-8">
            {!historyLoaded ? (
              <div className="flex items-center justify-center py-24 gap-2 text-sm text-text-secondary">
                <Spinner />
                Loading...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12">
                <h2 className="text-xl font-medium text-foreground">
                  How can I help with your search?
                </h2>
                <p className="mt-2 max-w-lg text-sm text-text-secondary text-pretty">
                  Ask me to discover companies, find contacts, or draft personalized
                  outreach. I remember your preferences across sessions.
                </p>
                <div className="mt-8 grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                      className="rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.role === "user" ? "flex justify-end" : ""}
                  >
                    <div
                      className={
                        msg.role === "user"
                          ? "max-w-[85%] rounded-2xl rounded-br-md chat-user-bubble px-4 py-3 text-sm"
                          : "max-w-[85%] rounded-2xl rounded-bl-md chat-assistant-bubble px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                      }
                    >
                      {msg.content ||
                        (msg.role === "assistant" && streaming ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="h-3.5 w-3.5" />
                            Thinking...
                          </span>
                        ) : null)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-bg-elevated p-4">
          <form
            onSubmit={handleSend}
            className="mx-auto flex max-w-3xl items-end gap-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Outpitch anything..."
              disabled={streaming}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-bg-base px-4 py-3 text-sm text-foreground placeholder:text-text-secondary focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-foreground/10 disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <Button
              type="submit"
              disabled={streaming || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-xl p-0"
              aria-label="Send message"
            >
              {streaming ? (
                <Spinner className="h-4 w-4 text-[var(--btn-primary-fg)]" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
