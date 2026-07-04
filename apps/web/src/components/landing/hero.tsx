"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Sparkles, CheckCircle2, Play, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PresetQuery = {
  id: string;
  label: string;
  command: string;
  role: string;
  results: Array<{
    company: string;
    domain: string;
    score: number;
    contact: string;
    title: string;
    email: string;
    subject: string;
    body: string;
  }>;
};

const presets: PresetQuery[] = [
  {
    id: "ai-startups",
    label: "Frontend @ AI",
    command: 'outpitch run --role "Senior Frontend Engineer" --signal "Series A..C AI"',
    role: "Senior Frontend Engineer",
    results: [
      {
        company: "Anthropic",
        domain: "anthropic.com",
        score: 94,
        contact: "Sarah K.",
        title: "VP of Engineering",
        email: "sarah.k@anthropic.com",
        subject: "Frontend architecture for Claude streaming",
        body: "Hi Sarah — I've been following Claude's web UI work. I led a real-time React migration that cut frame drops 42%. Would love 15 minutes to share ideas for your frontend team.",
      },
      {
        company: "Perplexity",
        domain: "perplexity.ai",
        score: 91,
        contact: "Alex M.",
        title: "Head of Design Engineering",
        email: "alex@perplexity.ai",
        subject: "Speed on Perplexity Pages",
        body: "Hi Alex — Perplexity's citation rendering is what sold me as a daily user. I built a compound doc editor to 200k MAU. Happy to show recent work.",
      },
      {
        company: "Linear",
        domain: "linear.app",
        score: 87,
        contact: "Karri S.",
        title: "Co-founder",
        email: "karri@linear.app",
        subject: "Keyboard-first UI performance",
        body: "Hi Karri — Linear set my bar for software craft. I obsess over 60fps and sub-50ms interactions. Would love to talk frontend performance.",
      },
    ],
  },
  {
    id: "devtools",
    label: "Fullstack @ DevTools",
    command: 'outpitch run --role "Fullstack Engineer" --stack "Next.js + Rust"',
    role: "Fullstack Engineer",
    results: [
      {
        company: "Warp",
        domain: "warp.dev",
        score: 96,
        contact: "Zach L.",
        title: "Engineering Lead",
        email: "zach@warp.dev",
        subject: "Cloud collaboration for Warp Drive",
        body: "Hi Zach — I build real-time sync for dev tools. Previously cut server sync overhead 60% with CRDTs. Would love to chat about Warp's roadmap.",
      },
      {
        company: "Raycast",
        domain: "raycast.com",
        score: 92,
        contact: "Thomas P.",
        title: "CEO",
        email: "thomas@raycast.com",
        subject: "Raycast AI & extensions",
        body: "Hi Thomas — Raycast replaced my spotlight workflow. I've shipped dev tooling with 15k GitHub stars. Let's connect.",
      },
    ],
  },
];

export function Hero() {
  const [selectedPreset, setSelectedPreset] = useState<PresetQuery>(presets[0]);
  const [customQuery, setCustomQuery] = useState(presets[0].command);
  const [isRunning, setIsRunning] = useState(false);
  const [logStep, setLogStep] = useState(4);
  const [activeDraftIndex, setActiveDraftIndex] = useState<number | null>(null);

  function handleRun(preset: PresetQuery) {
    setSelectedPreset(preset);
    setCustomQuery(preset.command);
    setIsRunning(true);
    setLogStep(0);
    setActiveDraftIndex(null);
  }

  useEffect(() => {
    if (!isRunning) return;
    const t1 = setTimeout(() => setLogStep(1), 350);
    const t2 = setTimeout(() => setLogStep(2), 800);
    const t3 = setTimeout(() => setLogStep(3), 1300);
    const t4 = setTimeout(() => {
      setLogStep(4);
      setIsRunning(false);
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isRunning]);

  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="max-w-3xl">
          <h1 className="animate-fade-up text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl text-balance">
            Find companies. Reach people. <span className="text-muted-foreground">Remember everything.</span>
          </h1>
          <p className="animate-fade-up delay-100 mt-5 max-w-lg text-base text-muted-foreground text-pretty">
            Hiring signals, verified contacts, personalized drafts — with memory that compounds.
          </p>

          <div className="animate-fade-up delay-200 mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-6">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pipeline-terminal">
              <Button variant="secondary" size="lg" className="h-12 px-6 font-mono">
                <Terminal className="h-4 w-4 text-accent" />
                Try demo
              </Button>
            </a>
          </div>
        </div>

        <div
          id="pipeline-terminal"
          className="animate-fade-up delay-300 mt-14 rounded-xl border border-border-strong bg-[#080808] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.95)] overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border bg-background-secondary px-4 py-3">
            <span className="text-xs font-mono text-muted-foreground">outpitch — demo</span>
            <Badge variant="primary" pulse>Live</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleRun(preset)}
                className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-mono transition-all duration-150 ${
                  selectedPreset.id === preset.id
                    ? "bg-surface-hover text-white border border-accent/50"
                    : "text-muted-foreground hover:bg-surface hover:text-white border border-transparent"
                }`}
              >
                <Play className="h-3 w-3 text-accent" />
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 border-b border-border bg-[#0d0d0d] px-4 py-3 font-mono text-sm">
            <span className="text-accent font-bold">&gt;</span>
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              disabled={isRunning}
              className="flex-1 bg-transparent text-white focus:outline-none font-mono disabled:opacity-60"
            />
            <Button
              size="sm"
              variant="terminal"
              onClick={() => handleRun(selectedPreset)}
              disabled={isRunning}
              className="h-7 px-3 text-xs"
            >
              {isRunning ? <RefreshCw className="h-3 w-3 animate-spin text-accent" /> : <Play className="h-3 w-3 text-accent" />}
              Run
            </Button>
          </div>

          <div className="p-4 font-mono text-xs leading-relaxed space-y-1.5 border-b border-border bg-[#060606] min-h-[88px]">
            {logStep >= 1 && (
              <div className="text-muted-foreground animate-fade-in">
                <span className="text-success">[discover]</span> 48 companies hiring
              </div>
            )}
            {logStep >= 2 && (
              <div className="text-muted-foreground animate-fade-in">
                <span className="text-accent">[memory]</span> Scored top 3 fits
              </div>
            )}
            {logStep >= 3 && (
              <div className="text-muted-foreground animate-fade-in">
                <span className="text-warning">[enrich]</span> Verified contacts
              </div>
            )}
            {logStep >= 4 && (
              <div className="text-success font-medium animate-fade-in flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                3 drafts ready
              </div>
            )}
          </div>

          <div className="divide-y divide-border">
            {selectedPreset.results.map((item, index) => {
              const isActive = activeDraftIndex === index;
              return (
                <div key={item.company}>
                  <div
                    onClick={() => setActiveDraftIndex(isActive ? null : index)}
                    className={`row-hover flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-3 ${
                      isActive ? "bg-surface" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border-strong bg-surface font-mono text-sm font-bold">
                        {item.company[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{item.company}</span>
                          <Badge variant={item.score >= 90 ? "success" : "primary"}>{item.score}%</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {item.contact} · {item.title}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? "primary" : "secondary"}
                      className="h-8 px-3 text-xs font-mono shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDraftIndex(isActive ? null : index);
                      }}
                    >
                      <Sparkles className="h-3 w-3 text-accent" />
                      {isActive ? "Close" : "Draft"}
                    </Button>
                  </div>

                  {isActive && (
                    <div className="border-t border-border bg-[#0c0c0c] p-5 animate-fade-in">
                      <div className="max-w-2xl mx-auto rounded-lg border border-border-strong bg-surface p-4">
                        <div className="text-xs font-mono text-muted-foreground mb-2">
                          To: {item.email}
                        </div>
                        <div className="text-sm font-semibold mb-3">{item.subject}</div>
                        <div className="rounded border border-border bg-[#080808] p-3 text-sm text-subtle whitespace-pre-wrap leading-relaxed">
                          {item.body}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Link href="/sign-up">
                            <Button size="sm" className="text-xs h-8">
                              <Mail className="h-3.5 w-3.5 mr-1" />
                              Connect Gmail
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
