"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { streamChat, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Terminal, Cpu, ArrowRight, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "outpitch discover --role 'Frontend Engineer' --signal 'Series A..C'",
  "outpitch inspect --pipeline 'Active Companies' --sort 'match_score'",
  "outpitch draft --target 'VP of Engineering' --tone 'Staff Engineer'",
  "outpitch memory --status 'Cognee Knowledge Graph'",
];

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ messages: Array<{ id: string; role: string; content: string }> }>(
      "/api/chat/history",
      { clerkUserId: user.id }
    )
      .then((data) => {
        setMessages(
          data.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
        );
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      () => setStreaming(false),
      (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `[SYSTEM ERROR]: ${error}` }
              : m
          )
        );
        setStreaming(false);
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <AppShell>
      <div className="flex h-screen flex-col bg-[#050505]">
        <PageHeader
          title="Intelligence Workstation"
          description="Autonomous agent terminal for hiring signal discovery and outreach drafting"
          meta="SESSION // ACTIVE — COGNEE MEMORY COMPOUNDING"
          action={
            <div className="flex items-center gap-2">
              <Badge variant="primary" pulse>GEMINI 3 PRO</Badge>
              <Link href="/companies">
                <Button size="sm" variant="secondary" className="h-8 text-xs font-mono">
                  View Pipeline <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          }
        />

        {/* Workstation Chat Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-5 py-8">
            {!historyLoaded ? (
              <div className="flex flex-col items-center justify-center py-24 text-xs font-mono text-[#888888] gap-3">
                <Spinner className="h-5 w-5 text-accent" />
                <span>INITIALIZING WORKSTATION &amp; SYNCING COGNEE GRAPH...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12">
                <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] p-8 shadow-2xl relative overflow-hidden">
                  <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none" aria-hidden />

                  <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-6">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
                      <Terminal className="h-4 w-4 text-accent" />
                      <span>outpitch-cli // workstation-init</span>
                    </div>
                    <Badge variant="success">READY FOR COMMANDS</Badge>
                  </div>

                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    How can I assist your search today?
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#888888] text-pretty font-mono">
                    I am connected to Serper real-time hiring signals, Apollo verified emails, and your persistent Cognee profile graph. Execute a command below or type your own query.
                  </p>

                  <div className="mt-8 space-y-2.5 font-mono text-xs">
                    <div className="text-[#888888] uppercase tracking-wider text-[11px] mb-2">
                      SUGGESTED CLI COMMANDS:
                    </div>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center justify-between w-full rounded border border-[#1f1f1f] bg-[#111111] p-3 text-left text-white transition-all duration-150 hover:border-accent hover:bg-[#161616] group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-accent font-bold">&gt;</span>
                          <span className="truncate">{s}</span>
                        </div>
                        <span className="text-[10px] text-[#888888] group-hover:text-white shrink-0 ml-2">[EXECUTE]</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                    {msg.role === "assistant" ? (
                      <div className="w-full rounded-lg border border-[#1f1f1f] bg-[#080808] p-5 shadow-lg font-mono text-xs sm:text-sm">
                        <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3 mb-3 text-[11px] text-[#888888]">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5 text-accent" />
                            <span className="text-white font-bold">OUTPITCH AGENT</span>
                            <span>|</span>
                            <span>MODEL: GEMINI 3 PRO</span>
                          </div>
                          <Badge variant="primary">COGNEE MEMORY SYNCED</Badge>
                        </div>
                        <div className="text-[#d4d4d4] leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.content || (
                            <span className="inline-flex items-center gap-2 text-[#888888] font-mono">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
                              Computing reasoning &amp; querying graph...
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%] rounded-lg border border-[#2a2a2a] bg-[#111111] px-4 py-3 text-sm text-white font-mono shadow-sm">
                        <div className="text-[10px] text-[#888888] mb-1 uppercase tracking-wider">&gt; USER COMMAND:</div>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Workstation Command Input Bar */}
        <div className="shrink-0 border-t border-[#1f1f1f] bg-[#0b0b0b] p-4">
          <form onSubmit={handleSend} className="mx-auto flex max-w-4xl items-end gap-3">
            <div className="flex-1 rounded-md border border-[#1f1f1f] bg-[#080808] px-3.5 py-2.5 flex items-center gap-2.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <span className="text-accent font-mono font-bold text-sm">&gt;</span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command or query (e.g. outpitch discover --role 'AI Engineer')..."
                disabled={streaming}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-[#888888] focus:outline-none disabled:opacity-50 font-mono"
                style={{ minHeight: "24px", maxHeight: "120px" }}
              />
            </div>
            <Button
              type="submit"
              disabled={streaming || !input.trim()}
              variant="terminal"
              className="h-10 px-5 text-xs font-mono bg-[#161616] hover:bg-[#2a2a2a] text-white shrink-0"
            >
              {streaming ? (
                <Spinner className="h-4 w-4 text-accent" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-accent" />
                  Execute
                </>
              )}
            </Button>
          </form>
          <div className="mx-auto mt-2.5 max-w-4xl flex items-center justify-between text-[11px] font-mono text-[#888888] px-1">
            <span>[ENTER] TO EXECUTE • [SHIFT+ENTER] FOR NEW LINE</span>
            <span>COGNEE PERSISTENT GRAPH: <span className="text-[#10b981]">CONNECTED</span></span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
