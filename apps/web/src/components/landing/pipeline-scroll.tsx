"use client";

import { useState } from "react";
import { Search, UserCheck, Send, CheckCircle2, Globe, Database, Mail, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pipelineSteps = [
  {
    id: "discover",
    number: "01",
    title: "Discover Hiring Signals",
    subtitle: "Serper-powered discovery finds companies actively hiring for your target role—not stale job boards.",
    description: "Outpitch continuously scans hiring announcements, career page updates, and funding rounds. Instead of browsing 1,000 generic listings, your agent presents only companies actively building teams in your domain.",
    icon: Search,
    stats: "1,400+ Signals Scanned / Session",
  },
  {
    id: "enrich",
    number: "02",
    title: "Enrich Decision Makers",
    subtitle: "Website crawling plus Apollo fallback surfaces direct emails for founders, recruiters, and engineering VPs.",
    description: "Once a target company is identified, Outpitch crawls their `/about` and `/team` pages, cross-referencing with Apollo.io to extract verified work emails. No more LinkedIn connection request limits or guessing email formats.",
    icon: UserCheck,
    stats: "98.2% Email Deliverability Rate",
  },
  {
    id: "dispatch",
    number: "03",
    title: "Dispatch from Your Inbox",
    subtitle: "Send through your connected Gmail via Composio. Drafts reflect your real experience, not robotic templates.",
    description: "Because Outpitch connects directly to your Gmail via OAuth, every message originates from your actual domain. Replies land straight in your primary inbox, tracked seamlessly by Cognee across follow-ups.",
    icon: Send,
    stats: "3.4x Higher Response Rate",
  },
];

export function PipelineScroll() {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section id="how-it-works" className="border-t border-[#1f1f1f] bg-[#050505] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            SECTION 03 // THE OUTREACH LOOP
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
            Three steps from <span className="text-[#888888]">signal to sent.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
            No spreadsheets. No copy-pasting LinkedIn URLs. No switching between 5 tabs. One cohesive autonomous workflow from discovery to your primary inbox.
          </p>
        </div>

        {/* ── STICKY NARRATIVE & DYNAMIC UI WINDOW ── */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          {/* Left Column: Interactive Step Navigation (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === index;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(index)}
                  className={`cursor-pointer rounded-xl border p-6 transition-all duration-200 ${
                    isActive
                      ? "border-[#3b82f6] bg-[#111111] shadow-lg"
                      : "border-[#1f1f1f] bg-[#0b0b0b] opacity-60 hover:opacity-100 hover:border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isActive ? "bg-[#3b82f6] text-white" : "bg-[#1f1f1f] text-[#888888]"
                      }`}>
                        {step.number}
                      </span>
                      <h3 className="text-base font-semibold text-white">{step.title}</h3>
                    </div>
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#3b82f6]" : "text-[#888888]"}`} />
                  </div>

                  <p className="text-xs font-mono text-[#d4d4d4] mb-3 leading-relaxed">
                    {step.subtitle}
                  </p>

                  {isActive && (
                    <div className="animate-fade-in space-y-3 pt-3 border-t border-[#1f1f1f]">
                      <p className="text-xs text-[#888888] leading-relaxed">
                        {step.description}
                      </p>
                      <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#10b981]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {step.stats}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Dynamic UI Workstation Window (7 cols) */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.95)] overflow-hidden min-h-[420px] flex flex-col">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-[#1f1f1f] bg-[#0b0b0b] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1f1f1f]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1f1f1f]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1f1f1f]" />
                  </div>
                  <span className="text-xs font-mono text-[#888888]">
                    {activeStep === 0 && "outpitch-discover — serper-stream"}
                    {activeStep === 1 && "outpitch-enrich — apollo-crawler"}
                    {activeStep === 2 && "outpitch-dispatch — composio-gmail"}
                  </span>
                </div>
                <Badge variant="primary">STEP 0{activeStep + 1} // ACTIVE</Badge>
              </div>

              {/* Window Content Display */}
              <div className="p-6 flex-1 flex flex-col justify-center bg-[#080808]">
                {activeStep === 0 && (
                  <div className="animate-fade-in space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3 text-xs font-mono text-[#888888]">
                      <span>QUERY: "Frontend Engineer @ AI Startups"</span>
                      <span className="text-[#10b981]">48 RESULTS FOUND</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { name: "Anthropic", role: "Frontend Architect", signal: "Series D • Posted 2h ago", score: "94%" },
                        { name: "Perplexity", role: "Design Engineer", signal: "Series B • Posted 5h ago", score: "91%" },
                        { name: "Granola", role: "Senior Frontend", signal: "Series A • Posted 1d ago", score: "89%" },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-3.5 rounded-lg border border-[#1f1f1f] bg-[#111111] font-mono text-xs">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-[#3b82f6]" />
                            <div>
                              <div className="font-bold text-white">{item.name}</div>
                              <div className="text-[11px] text-[#888888]">{item.role} — <span className="text-[#10b981]">{item.signal}</span></div>
                            </div>
                          </div>
                          <Badge variant="success">{item.score} FIT</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="animate-fade-in space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3 text-xs font-mono text-[#888888]">
                      <span>TARGET: ANTHROPIC ENGINEERING LEADERSHIP</span>
                      <span className="text-[#3b82f6]">APOLLO + CRAWL READY</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { name: "Sarah K.", title: "VP of Engineering", email: "sarah.k@anthropic.com", conf: "99% Verified", source: "Apollo + Web" },
                        { name: "David L.", title: "Head of AI Frontend", email: "david@anthropic.com", conf: "96% Verified", source: "Career Page" },
                        { name: "Elena R.", title: "Technical Recruiter", email: "elena@anthropic.com", conf: "94% Verified", source: "Apollo.io" },
                      ].map((item) => (
                        <div key={item.email} className="flex items-center justify-between p-3.5 rounded-lg border border-[#1f1f1f] bg-[#111111] font-mono text-xs">
                          <div className="flex items-center gap-3">
                            <Database className="h-4 w-4 text-[#f59e0b]" />
                            <div>
                              <div className="font-bold text-white">{item.name} <span className="text-[#888888]">({item.title})</span></div>
                              <div className="text-[11px] text-[#3b82f6]">{item.email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="primary">{item.conf}</Badge>
                            <div className="text-[10px] text-[#888888] mt-1">{item.source}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="animate-fade-in space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3 text-xs font-mono text-[#888888]">
                      <span>COMPOSIO DISPATCH ENGINE // GMAIL CONNECTED</span>
                      <span className="text-[#10b981]">OAUTH VERIFIED</span>
                    </div>

                    <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] p-5 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between text-[#888888] pb-2 border-b border-[#1f1f1f]">
                        <div><span className="text-white">FROM:</span> alex.builder@gmail.com</div>
                        <div><span className="text-white">TO:</span> sarah.k@anthropic.com</div>
                      </div>
                      <div className="text-white font-semibold">
                        SUBJECT: Frontend architecture for Claude 3.7 streaming responses
                      </div>
                      <div className="text-[#d4d4d4] leading-relaxed bg-[#080808] p-3 rounded border border-[#1f1f1f]">
                        Hi Sarah, I've been following Anthropic's recent updates... As a Senior Frontend Engineer with 7 years of experience scaling real-time React pipelines, I noticed how seamlessly you handle token streaming...
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-[#10b981]">✓ Cognee memory applied: Tone match 98%</span>
                        <Button size="sm" className="h-7 px-3 text-xs">
                          <Send className="h-3 w-3 mr-1" />
                          Send Now (1-Click)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Window Footer Navigation */}
              <div className="flex items-center justify-between border-t border-[#1f1f1f] bg-[#0b0b0b] px-4 py-3 text-xs font-mono">
                <div className="text-[#888888]">
                  STEP <strong className="text-white">{activeStep + 1}</strong> OF <strong className="text-white">3</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                    className="h-7 px-3 text-xs"
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={activeStep === 2}
                    onClick={() => setActiveStep((prev) => Math.min(2, prev + 1))}
                    className="h-7 px-3 text-xs"
                  >
                    Next Step <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
