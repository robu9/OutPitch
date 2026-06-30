"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { streamChat, apiFetch } from "@/lib/api";
import { Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
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
            m.id === assistantId ? { ...m, content: `Error: ${error}` } : m
          )
        );
        setStreaming(false);
      }
    );
  }

  const suggestions = [
    "Find frontend engineer roles at AI startups",
    "Show my outreach status",
    "What companies have we discovered?",
    "Help me improve my job search strategy",
  ];

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        <header className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Chat with Outpitch</h1>
          <p className="text-sm text-muted-foreground">
            Ask me to find companies, draft emails, or track your outreach
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-medium mb-2">How can I help?</h2>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 text-sm border border-border rounded-full hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[70%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {msg.content || (streaming ? "..." : "")}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-border px-6 py-4 flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Outpitch anything..."
            disabled={streaming}
            className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            {streaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
