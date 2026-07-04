"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Sparkles, CheckCircle2, Play, RefreshCw, Mail, ExternalLink, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PresetQuery = {
  id: string;
  label: string;
  command: string;
  role: string;
  filter: string;
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
    label: "Frontend @ AI Startups",
    command: 'outpitch run --role "Senior Frontend Engineer" --signal "Series A..C AI"',
    role: "Senior Frontend Engineer",
    filter: "AI Startups (SF / Remote)",
    results: [
      {
        company: "Anthropic",
        domain: "anthropic.com",
        score: 94,
        contact: "Sarah K.",
        title: "VP of Engineering",
        email: "sarah.k@anthropic.com",
        subject: "Frontend architecture for Claude 3.7 streaming responses",
        body: "Hi Sarah,\n\nI've been following Anthropic's recent updates to the Claude web interface. As a Senior Frontend Engineer with 7 years of experience scaling real-time React pipelines (which Cognee noted in my profile), I noticed how seamlessly you handle token streaming under heavy UI load.\n\nAt my last role, I led the migration of our real-time websocket rendering engine, cutting frame drops by 42%. I'd love to share a few ideas on how I could help the frontend team build out the next generation of model interaction tools.\n\nAre you open to a brief 15-min chat next week?",
      },
      {
        company: "Perplexity",
        domain: "perplexity.ai",
        score: 91,
        contact: "Alex M.",
        title: "Head of Design Engineering",
        email: "alex@perplexity.ai",
        subject: "Speed & micro-interactions on Perplexity Pages",
        body: "Hi Alex,\n\nPerplexity's UI speed is unmatched—the instant citation rendering is what drew me in as a daily user. I'm a Frontend Engineer specializing in high-performance Next.js architectures and keyboard-first workflows.\n\nI saw your hiring signal on Serper for a Design Engineer to push the boundaries of Perplexity Pages. I built a similar compound document editor that scaled to 200k MAU. Would love to connect and show you a quick demo of my recent work.",
      },
      {
        company: "Linear",
        domain: "linear.app",
        score: 87,
        contact: "Karri S.",
        title: "Co-founder & Head of Design",
        email: "karri@linear.app",
        subject: "Craftsmanship & keyboard-first UI performance",
        body: "Hi Karri,\n\nLinear has set the industry standard for what software craftsmanship should feel like. As an engineer who obsesses over 60fps animations and sub-50ms interaction latency, your product has been my benchmark.\n\nMy Cognee graph highlighted my background building custom layout engines in React and Tailwind. I'd love to contribute to Linear's core frontend performance team.",
      },
    ],
  },
  {
    id: "devtools",
    label: "Fullstack @ DevTools",
    command: 'outpitch run --role "Fullstack Engineer" --stack "Next.js + Rust + Postgres"',
    role: "Fullstack Engineer",
    filter: "High-Velocity DevTools",
    results: [
      {
        company: "Warp",
        domain: "warp.dev",
        score: 96,
        contact: "Zach L.",
        title: "Engineering Lead",
        email: "zach@warp.dev",
        subject: "Next.js cloud collaboration features for Warp Drive",
        body: "Hi Zach,\n\nWarp's transition of the terminal into a collaborative workspace is brilliant. As a Fullstack Engineer working across TypeScript, Next.js, and Postgres, I specialize in building real-time sync systems for developer tools.\n\nI noticed Warp is expanding its cloud features. I previously architected an offline-first collaboration layer using CRDTs that reduced server sync overhead by 60%. Would love to chat about Warp's product roadmap.",
      },
      {
        company: "Raycast",
        domain: "raycast.com",
        score: 92,
        contact: "Thomas P.",
        title: "Co-founder & CEO",
        email: "thomas@raycast.com",
        subject: "Extending Raycast AI & developer extensions ecosystem",
        body: "Hi Thomas,\n\nRaycast has completely replaced my system spotlight and shortcut workflows. I'm a Fullstack Engineer with a deep focus on developer productivity tools and API ecosystem design.\n\nI saw your team is hiring engineers to scale the Raycast AI platform and extension store. I've built open-source developer tooling with over 15k GitHub stars. Let's connect!",
      },
    ],
  },
];

export function Hero() {
  const [selectedPreset, setSelectedPreset] = useState<PresetQuery>(presets[0]);
  const [customQuery, setCustomQuery] = useState(presets[0].command);
  const [isRunning, setIsRunning] = useState(false);
  const [logStep, setLogStep] = useState(4); // 0: start, 1: serper, 2: cognee, 3: apollo, 4: done
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
      {/* Background Architectural Grid & Subtle Scanline */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="scanline pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5">
        {/* Top Telemetry Bar */}
        <div className="animate-fade-in mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#1f1f1f] pb-4 text-xs font-mono text-[#888888]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
            </span>
            <span className="text-white font-semibold">OUTPITCH AGENT v2.4</span>
            <span className="text-[#1f1f1f]">|</span>
            <span>COGNEE MEMORY: <span className="text-[#10b981]">SYNCED</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px]">
            <span>SIGNAL SOURCE: <span className="text-white">SERPER + APOLLO</span></span>
            <span>MODEL: <span className="text-white">GEMINI 3 PRO</span></span>
          </div>
        </div>

        {/* Hero Headline & Editorial Subtitle */}
        <div className="max-w-4xl">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded border border-[#1f1f1f] bg-[#111111] px-2.5 py-1 text-xs font-mono text-[#888888] mb-6">
            <Cpu className="h-3.5 w-3.5 text-[#3b82f6]" />
            AUTONOMOUS OUTREACH WORKSTATION
          </div>
          <h1 className="animate-fade-up delay-100 text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-[4.25rem] text-balance">
            Find companies. Reach people. <span className="text-[#888888]">Remember everything.</span>
          </h1>
          <p className="animate-fade-up delay-200 mt-6 max-w-2xl text-base leading-relaxed text-[#888888] text-pretty md:text-lg">
            Outpitch discovers real-time hiring signals, surfaces verified decision-maker emails, and drafts personalized outreach from your inbox. Powered by <strong className="font-medium text-white">Cognee memory</strong>—so every session compounds your intelligence.
          </p>
          
          <div className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-6 text-sm">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pipeline-terminal">
              <Button variant="secondary" size="lg" className="h-12 px-6 text-sm font-mono">
                <Terminal className="h-4 w-4 text-[#3b82f6]" />
                Interactive Terminal
              </Button>
            </a>
            <div className="ml-2 flex items-center gap-2 text-xs font-mono text-[#888888]">
              <span className="text-[#10b981]">✓</span> No credit card required
            </div>
          </div>
        </div>

        {/* ── THE AUTONOMOUS COMMAND CENTER TERMINAL ── */}
        <div id="pipeline-terminal" className="animate-fade-up delay-400 mt-16 rounded-xl border border-[#2a2a2a] bg-[#080808] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.95)] overflow-hidden">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0b0b0b] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-[#1f1f1f] border border-[#2a2a2a]" />
                <span className="h-3 w-3 rounded-full bg-[#1f1f1f] border border-[#2a2a2a]" />
                <span className="h-3 w-3 rounded-full bg-[#1f1f1f] border border-[#2a2a2a]" />
              </div>
              <span className="text-xs font-mono text-[#888888]">outpitch-agent — bash — 80×24</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" pulse>LIVE PIPELINE</Badge>
              <span className="text-[11px] font-mono text-[#888888] hidden sm:inline">MEMORY: COMPOUNDING</span>
            </div>
          </div>

          {/* Preset Command Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#1f1f1f] bg-[#080808] px-4 py-2.5">
            <span className="text-xs font-mono text-[#888888] mr-2">PRESET TARGETS:</span>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleRun(preset)}
                className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-mono transition-all duration-150 ${
                  selectedPreset.id === preset.id
                    ? "bg-[#161616] text-white border border-[#3b82f6]/50 shadow-sm"
                    : "text-[#888888] hover:bg-[#111111] hover:text-white border border-transparent"
                }`}
              >
                <Play className="h-3 w-3 text-[#3b82f6]" />
                {preset.label}
              </button>
            ))}
          </div>

          {/* Terminal Command Line Input */}
          <div className="flex items-center gap-3 border-b border-[#1f1f1f] bg-[#0d0d0d] px-4 py-3 font-mono text-xs sm:text-sm">
            <span className="text-[#3b82f6] font-bold">&gt;</span>
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
              className="h-7 px-3 text-xs bg-[#161616] hover:bg-[#2a2a2a]"
            >
              {isRunning ? <RefreshCw className="h-3 w-3 animate-spin text-[#3b82f6]" /> : <Play className="h-3 w-3 text-[#3b82f6]" />}
              {isRunning ? "Running..." : "Execute"}
            </Button>
          </div>

          {/* Terminal Telemetry Log Stream */}
          <div className="p-4 sm:p-6 font-mono text-xs leading-relaxed space-y-2 border-b border-[#1f1f1f] bg-[#060606] min-h-[140px]">
            <div className="flex items-center gap-2 text-[#888888]">
              <span className="text-white font-bold">[00:00s]</span>
              <span className="text-[#3b82f6]">[INIT]</span>
              <span>Initializing Outpitch agent pipeline for role: <strong className="text-white">{selectedPreset.role}</strong>...</span>
            </div>
            
            {logStep >= 1 && (
              <div className="flex items-center gap-2 text-[#888888] animate-fade-in">
                <span className="text-white font-bold">[00:01s]</span>
                <span className="text-[#10b981]">[SERPER]</span>
                <span>Scanned 1,420 companies. Found <strong className="text-white">48 actively hiring</strong> with verified engineering signals.</span>
              </div>
            )}

            {logStep >= 2 && (
              <div className="flex items-center gap-2 text-[#888888] animate-fade-in">
                <span className="text-white font-bold">[00:02s]</span>
                <span className="text-[#3b82f6]">[COGNEE]</span>
                <span>Applying memory graph: Candidate has 7 yrs React experience, prefers high-velocity culture. <strong className="text-white">Scored top 3 fits</strong>.</span>
              </div>
            )}

            {logStep >= 3 && (
              <div className="flex items-center gap-2 text-[#888888] animate-fade-in">
                <span className="text-white font-bold">[00:03s]</span>
                <span className="text-[#f59e0b]">[APOLLO]</span>
                <span>Enriched contacts: Extracted direct email addresses for VP/Founding engineers. <strong className="text-white">100% deliverability verified</strong>.</span>
              </div>
            )}

            {logStep >= 4 && (
              <div className="flex items-center gap-2 text-[#10b981] font-semibold animate-fade-in">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                <span>[READY] Pipeline complete. 3 personalized outreach drafts generated in candidate voice.</span>
              </div>
            )}
          </div>

          {/* Interactive Results Grid */}
          <div className="bg-[#080808]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f1f1f] text-xs font-mono text-[#888888] bg-[#0a0a0a]">
              <span>DISCOVERED COMPANIES ({selectedPreset.results.length})</span>
              <span>CLICK ROW TO INSPECT AI OUTREACH DRAFT</span>
            </div>

            <div className="divide-y divide-[#1f1f1f]">
              {selectedPreset.results.map((item, index) => {
                const isActive = activeDraftIndex === index;
                return (
                  <div key={item.company} className="transition-colors duration-150">
                    {/* Table Row */}
                    <div
                      onClick={() => setActiveDraftIndex(isActive ? null : index)}
                      className={`row-hover flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-4 ${
                        isActive ? "bg-[#111111] border-l-2 border-l-[#3b82f6]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#2a2a2a] bg-[#111111] font-mono text-sm font-bold text-white">
                          {item.company[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-white truncate">{item.company}</span>
                            <Badge variant={item.score >= 90 ? "success" : "primary"}>
                              {item.score}% COGNEE MATCH
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#888888] mt-0.5 font-mono">
                            <span>{item.domain}</span>
                            <span>•</span>
                            <span className="text-[#d4d4d4]">{item.contact} <span className="text-[#888888]">({item.title})</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-mono text-[#888888] hidden md:inline">
                          <Mail className="h-3 w-3 inline mr-1 text-[#3b82f6]" />
                          {item.email}
                        </span>
                        <Button
                          size="sm"
                          variant={isActive ? "primary" : "secondary"}
                          className="h-8 px-3 text-xs font-mono shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDraftIndex(isActive ? null : index);
                          }}
                        >
                          <Sparkles className="h-3 w-3 text-[#3b82f6]" />
                          {isActive ? "Close Draft" : "Inspect Draft"}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Outreach Draft Drawer */}
                    {isActive && (
                      <div className="border-t border-[#1f1f1f] bg-[#0c0c0c] p-5 sm:p-6 animate-fade-in">
                        <div className="max-w-3xl mx-auto rounded-lg border border-[#2a2a2a] bg-[#111111] p-5 shadow-2xl">
                          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3.5 mb-4 text-xs font-mono">
                            <div className="flex items-center gap-2 text-[#888888]">
                              <span className="text-white font-semibold">FROM:</span> Your Connected Gmail
                              <span className="text-[#1f1f1f]">|</span>
                              <span className="text-white font-semibold">TO:</span> {item.contact} &lt;{item.email}&gt;
                            </div>
                            <Badge variant="primary">COGNEE TONE: TECHNICAL &amp; DIRECT</Badge>
                          </div>

                          <div className="mb-3 text-xs font-mono">
                            <span className="text-[#888888]">SUBJECT:</span> <span className="text-white font-semibold">{item.subject}</span>
                          </div>

                          <div className="rounded border border-[#1f1f1f] bg-[#080808] p-4 font-mono text-xs sm:text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">
                            {item.body}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
                              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                              Personalized using Cognee research dataset: <span className="text-white">{item.company}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="secondary" className="text-xs h-8">
                                Edit in Chat
                              </Button>
                              <Link href="/sign-up">
                                <Button size="sm" className="text-xs h-8 bg-white text-black hover:bg-[#e0e0e0]">
                                  <Mail className="h-3.5 w-3.5 mr-1" />
                                  Connect Gmail to Send
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal Footer */}
          <div className="flex items-center justify-between border-t border-[#1f1f1f] bg-[#0b0b0b] px-4 py-2.5 text-[11px] font-mono text-[#888888]">
            <div className="flex items-center gap-4">
              <span>STATUS: <span className="text-[#10b981]">IDLE</span></span>
              <span>COMPOSIO INTEGRATION: <span className="text-white">GMAIL + LINKEDIN READY</span></span>
            </div>
            <span>TYPE <strong className="text-white">help</strong> FOR CLI DOCS OR CLICK PRESET TO EXECUTE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
