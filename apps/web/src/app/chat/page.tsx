"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import {
  streamChat,
  apiFetch,
  fetchPipelineStatus,
  sendOutreachEmail,
  type ChatSession,
  type PipelineStatus,
  type OutreachDraft,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Building2,
  Mail,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  jobId?: string;
  drafts?: OutreachDraft[];
}

const suggestions = [
  "Find Series A–C fintech startups in NYC for frontend outreach",
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
      type HistoryMsg = {
        id: string;
        role: string;
        content: string;
        metadata?: { jobId?: string; drafts?: OutreachDraft[] } | null;
      };
      const data = await apiFetch<{ messages: HistoryMsg[] }>(
        `/api/chat/history${query}`,
        { clerkUserId: user.id }
      ).catch(() => ({ messages: [] as HistoryMsg[] }));
      setMessages(
        data.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            jobId: m.metadata?.jobId,
            drafts: m.metadata?.drafts,
          }))
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

  async function handleSend(e?: React.FormEvent, presetMessage?: string) {
    e?.preventDefault();
    const userMessage = (presetMessage ?? input).trim();
    if (!userMessage || !user || streaming) return;

    if (!presetMessage) setInput("");
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

    try {
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
          loadSessions();
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Error: ${error}` }
                : m
            )
          );
        },
        {
          sessionId: sessionId ?? undefined,
          onSession: (sid) => {
            if (!sessionId) setSessionId(sid);
          },
          onJob: (jobId) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, jobId } : m))
            );
          },
          onDraft: (draft) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, drafts: [...(m.drafts ?? []), draft] }
                  : m
              )
            );
          },
        }
      );
    } finally {
      // Guarantee the UI unlocks even if the stream ends without a terminal event.
      setStreaming(false);
    }
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
                    className={msg.role === "user" ? "flex justify-end" : "space-y-2"}
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
                    {msg.role === "assistant" && msg.jobId && (
                      <PipelineCard
                        jobId={msg.jobId}
                        clerkUserId={user?.id ?? null}
                        onDraftOutreach={() =>
                          handleSend(undefined, "Yes, Draft emails")
                        }
                        outreachDisabled={streaming}
                      />
                    )}
                    {msg.role === "assistant" && (msg.drafts?.length ?? 0) > 0 && (
                      <EmailDraftsCard
                        drafts={msg.drafts!}
                        clerkUserId={user?.id ?? null}
                      />
                    )}
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

const TERMINAL = new Set(["completed", "failed"]);

function PipelineCard({
  jobId,
  clerkUserId,
  onDraftOutreach,
  outreachDisabled,
}: {
  jobId: string;
  clerkUserId: string | null;
  onDraftOutreach?: (jobId: string) => void;
  outreachDisabled?: boolean;
}) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!clerkUserId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const s = await fetchPipelineStatus(jobId, clerkUserId);
        if (!active) return;
        setStatus(s);
        if (!TERMINAL.has(s.status)) {
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (active) timer = setTimeout(poll, 3000);
      }
    };
    poll();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [jobId, clerkUserId]);

  const companies = status?.companies ?? [];
  const done = status ? TERMINAL.has(status.status) : false;
  const failed = status?.status === "failed";

  return (
    <div className="max-w-[85%] rounded-xl border border-border bg-bg-elevated overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <Search className="h-4 w-4 text-text-secondary" aria-hidden />
        <span className="text-xs font-medium text-foreground">Company search</span>
        {!done && <Spinner className="h-3.5 w-3.5" />}
        {done && !failed && (
          <Badge variant="outline">{companies.length} found</Badge>
        )}
        {failed && <Badge variant="outline">failed</Badge>}
        <Link
          href="/companies"
          className="ml-auto text-xs text-text-secondary hover:text-foreground"
        >
          View pipeline →
        </Link>
      </div>

      {/* Progress while running */}
      {!done && (
        <div className="px-4 py-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-base">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${status?.progress ?? 5}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {status?.message ?? "Starting search…"}
          </p>
        </div>
      )}

      {failed && (
        <div className="px-4 py-3 text-xs text-text-secondary">
          {status?.error ?? "Search failed. Please try again."}
        </div>
      )}

      {/* Results */}
      {done && !failed && companies.length === 0 && (
        <div className="px-4 py-3 text-xs text-text-secondary">
          No matching companies found — try broadening the role or location.
        </div>
      )}

      {done && !failed && companies.length > 0 && (
        <ul className="divide-y divide-border">
          {companies.map((c) => {
            const isOpen = expanded[c.id];
            const contacts = c.contacts ?? [];
            const hasContacts = contacts.length > 0;
            return (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      hasContacts &&
                      setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))
                    }
                    className={`mt-0.5 shrink-0 text-text-secondary ${hasContacts ? "hover:text-foreground" : "invisible"}`}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <a
                        href={`https://${c.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-foreground"
                      >
                        {c.domain}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                      <Badge variant="outline">{c.matchScore}% match</Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {hasContacts ? `${contacts.length} contact${contacts.length > 1 ? "s" : ""}` : "Contacts pending"}
                    </p>

                    {isOpen && hasContacts && (
                      <ul className="mt-2 space-y-1.5">
                        {contacts.map((ct, i) => (
                          <li
                            key={ct.id ?? `${ct.name}-${i}`}
                            className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg-base p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="text-xs text-foreground">
                              {ct.name}
                              {ct.title && (
                                <span className="text-text-secondary"> · {ct.title}</span>
                              )}
                            </span>
                            {ct.email && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                                <Mail className="h-3 w-3" aria-hidden />
                                {ct.email}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done && !failed && companies.length > 0 && onDraftOutreach && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-text-secondary">
            {status?.message?.includes("Want me to draft")
              ? status.message
              : "Want me to draft outreach emails for the top matches?"}
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={outreachDisabled}
            onClick={() => onDraftOutreach(jobId)}
          >
            Yes, draft emails
          </Button>
        </div>
      )}
    </div>
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function EmailDraftsCard({
  drafts,
  clerkUserId,
}: {
  drafts: OutreachDraft[];
  clerkUserId: string | null;
}) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!clerkUserId || drafts.length === 0) return;
    const ids = new Set(drafts.map((d) => d.campaignId));
    apiFetch<{ campaigns: { id: string; status: string }[] }>("/api/outreach", {
      clerkUserId,
    })
      .then((data) => {
        const alreadySent = data.campaigns
          .filter((c) => ids.has(c.id) && (c.status === "sent" || c.status === "replied"))
          .map((c) => c.id);
        if (alreadySent.length > 0) {
          setSentIds((prev) => new Set([...prev, ...alreadySent]));
        }
      })
      .catch(() => {});
  }, [clerkUserId, drafts]);

  const pending = drafts.filter(
    (d) => !sentIds.has(d.campaignId) && isValidEmail(d.to)
  );
  const hasInvalid = drafts.some((d) => !isValidEmail(d.to));

  async function sendOne(draft: OutreachDraft, trackSending = true) {
    if (!clerkUserId) return false;
    if (trackSending) setSendingId(draft.campaignId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[draft.campaignId];
      return next;
    });
    try {
      await sendOutreachEmail(clerkUserId, {
        to: draft.to,
        subject: draft.subject,
        body: draft.body,
        campaignId: draft.campaignId,
        companyId: draft.companyId,
      });
      setSentIds((prev) => new Set(prev).add(draft.campaignId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send";
      setErrors((prev) => ({ ...prev, [draft.campaignId]: message }));
      return false;
    } finally {
      if (trackSending) setSendingId(null);
    }
  }

  async function sendAll() {
    if (!clerkUserId || pending.length === 0) return;
    setSendingAll(true);
    for (const draft of pending) {
      await sendOne(draft, false);
    }
    setSendingAll(false);
  }

  return (
    <div className="max-w-[85%] space-y-2">
      {drafts.map((draft) => {
        const sent = sentIds.has(draft.campaignId);
        const invalid = !isValidEmail(draft.to);
        const sending = sendingId === draft.campaignId || sendingAll;
        const error = errors[draft.campaignId];

        return (
          <div
            key={draft.campaignId}
            className="rounded-xl border border-border bg-bg-elevated overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Mail className="h-4 w-4 text-text-secondary" aria-hidden />
              <span className="text-xs font-medium text-foreground">
                {draft.companyName ? `Draft · ${draft.companyName}` : "Email draft"}
              </span>
              {sent && <Badge variant="primary">Sent</Badge>}
              {invalid && !sent && <Badge variant="outline">No email</Badge>}
            </div>
            <div className="space-y-2 px-4 py-3 text-xs">
              <p className="text-text-secondary">
                To:{" "}
                <span className="text-foreground">
                  {draft.contactName ? `${draft.contactName} · ` : ""}
                  {draft.to}
                </span>
              </p>
              <p className="text-text-secondary">
                Subject: <span className="text-foreground">{draft.subject}</span>
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {draft.body}
              </p>
              {error && (
                <p className="text-xs text-red-500">
                  {error.includes("Gmail not connected") ? (
                    <>
                      Connect Gmail in{" "}
                      <Link href="/settings" className="underline">
                        settings
                      </Link>{" "}
                      to send.
                    </>
                  ) : (
                    error
                  )}
                </p>
              )}
              {!sent && (
                <Button
                  type="button"
                  size="sm"
                  disabled={invalid || sending || !clerkUserId || sent}
                  onClick={() => {
                    if (!sent) void sendOne(draft);
                  }}
                  className="mt-1"
                >
                  {sending ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send email
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {pending.length > 1 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={sendingAll || sendingId !== null || !clerkUserId}
          onClick={sendAll}
          className="w-full"
        >
          {sendingAll ? (
            <>
              <Spinner className="h-3.5 w-3.5" />
              Sending {pending.length} emails...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Send all ({pending.length})
            </>
          )}
        </Button>
      )}

      {hasInvalid && (
        <p className="text-xs text-text-secondary px-1">
          Some drafts are missing a contact email — add one in Companies before sending.
        </p>
      )}
    </div>
  );
}
