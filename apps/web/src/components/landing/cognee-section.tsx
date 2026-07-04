"use client";

import { useState } from "react";
import { Brain, GitBranch, MessageSquareQuote, UserRound, Sparkles, CheckCircle2, ArrowRight, Share2, Database, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type MemoryNode = {
  id: string;
  label: string;
  type: "profile" | "research" | "contact" | "history" | "engine";
  title: string;
  subtitle: string;
  details: string[];
  connections: string[];
  metrics: string;
};

const nodes: MemoryNode[] = [
  {
    id: "profile",
    label: "01 // PROFILE DATASET",
    type: "profile",
    title: "Senior Frontend Architect",
    subtitle: "Synced via LinkedIn & Onboarding Goals",
    details: [
      "7+ years scaling real-time React & Next.js architectures.",
      "Key achievements: Reduced websocket latency by 42% at previous startup.",
      "Target preferences: Series A to C AI startups or DevTools in SF / Remote.",
      "Tone profile: Concise, technical, zero marketing fluff.",
    ],
    connections: ["research", "engine"],
    metrics: "100% PROFILE SYNCED",
  },
  {
    id: "research",
    label: "02 // COMPANY RESEARCH",
    type: "research",
    title: "Anthropic Engineering Dataset",
    subtitle: "Crawled from /careers, Serper & Tech Blog",
    details: [
      "Active hiring signal: Expanded web engineering team for Claude 3.7 rollout.",
      "Tech stack: TypeScript, Next.js, Rust backend, high-throughput streaming.",
      "Recent engineering challenge: Rendering massive markdown & artifact streams under heavy UI load.",
      "Company culture: Highly rigorous, written-communication first.",
    ],
    connections: ["contact", "engine"],
    metrics: "14 DATA POINTS INGESTED",
  },
  {
    id: "contact",
    label: "03 // CONTACT GRAPH",
    type: "contact",
    title: "Sarah K. — VP of Engineering",
    subtitle: "Enriched via Apollo.io + Website Crawling",
    details: [
      "Verified direct work email: sarah.k@anthropic.com (100% deliverability).",
      "Background: Former staff engineer at Stripe, values deep technical rigor.",
      "Communication preference: Responds best to emails mentioning specific technical problems over generic resumes.",
    ],
    connections: ["engine"],
    metrics: "DIRECT EMAIL VERIFIED",
  },
  {
    id: "history",
    label: "04 // CONVERSATION RECALL",
    type: "history",
    title: "Session History #12 (Last Week)",
    subtitle: "Persistent across browser closes",
    details: [
      "User rejected 4 fintech companies due to legacy Java/Angular codebases.",
      "User refined salary requirements to $220k+ base.",
      "User liked draft tone for Linear (direct, concise, highlighting UI latency).",
      "Cognee instruction: Apply 'direct & concise' rule to all future AI drafts.",
    ],
    connections: ["engine"],
    metrics: "4 PREFERENCES COMPOUNDED",
  },
  {
    id: "engine",
    label: "05 // COGNEE SYNTHESIS ENGINE",
    type: "engine",
    title: "Tailored Outreach Generation",
    subtitle: "Compounding Intelligence Output",
    details: [
      "Synthesizes Profile (01) + Research (02) + Contact (03) + History (04).",
      "Eliminates generic intros ('I am writing to apply...').",
      "Injects specific React streaming latency achievement from Profile directly into Anthropic's Claude 3.7 UI challenge.",
      "Result: 98% candidate tone match and 3.4x higher interview conversion.",
    ],
    connections: [],
    metrics: "98% TONE ACCURACY",
  },
];

export function CogneeSection() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("engine");
  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[4];

  return (
    <section id="cognee" className="border-t border-[#1f1f1f] bg-[#0b0b0b] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
              <Brain className="h-3.5 w-3.5" />
              SECTION 04 // THE COGNEE NEURAL SPINE
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
              Memory that makes outreach <span className="text-[#888888]">smarter over time.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
              Most AI tools suffer from amnesia—the moment you close the tab, your context is lost. Outpitch is built on <strong className="text-white font-medium">Cognee</strong>, a persistent knowledge graph that connects your profile, company research, and conversation history into a compounding neural web.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-mono text-[#888888]">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6] animate-pulse" />
            INTERACTIVE GRAPH INSPECTOR
          </div>
        </div>

        {/* ── INTERACTIVE KNOWLEDGE GRAPH MATRIX ── */}
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Network Nodes List (6 cols) */}
          <div className="space-y-3 lg:col-span-6">
            <div className="text-xs font-mono text-[#888888] pb-2 border-b border-[#1f1f1f] mb-4">
              SELECT MEMORY NODE TO INSPECT SYNAPTIC LINKS:
            </div>

            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = activeNode.connections.includes(node.id) || node.connections.includes(activeNode.id);

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                    isSelected
                      ? "border-[#3b82f6] bg-[#111111] shadow-xl"
                      : isConnected
                        ? "border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#3b82f6]/50"
                        : "border-[#1f1f1f] bg-[#080808] opacity-70 hover:opacity-100 hover:border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-[#3b82f6]">
                      {node.label}
                    </span>
                    <Badge variant={isSelected ? "primary" : isConnected ? "success" : "muted"}>
                      {node.metrics}
                    </Badge>
                  </div>

                  <div className="text-base font-semibold text-white">
                    {node.title}
                  </div>
                  <div className="text-xs font-mono text-[#888888] mt-0.5">
                    {node.subtitle}
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-[#1f1f1f] animate-fade-in space-y-2">
                      {node.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-mono text-[#d4d4d4]">
                          <span className="text-[#3b82f6] mt-0.5">▪</span>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Synaptic Data Inspector (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-[#2a2a2a] bg-[#080808] p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-xs font-mono text-white font-bold">NODE INSPECTOR // {activeNode.id.toUpperCase()}</span>
                </div>
                <Badge variant="primary">COGNEE GRAPH v2</Badge>
              </div>

              {/* Node Visualization Box */}
              <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-white font-mono">{activeNode.title}</div>
                  <span className="text-xs font-mono text-[#10b981]">ACTIVE SYNAPSE</span>
                </div>
                
                <p className="text-xs font-mono text-[#888888] mb-6">
                  {activeNode.subtitle}
                </p>

                <div className="space-y-2.5 border-t border-[#1f1f1f] pt-4">
                  <div className="text-xs font-mono text-[#888888] uppercase tracking-wider mb-2">
                    INGESTED DATA ATTRIBUTES:
                  </div>
                  {activeNode.details.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs font-mono text-white bg-[#080808] p-3 rounded border border-[#1f1f1f]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#3b82f6] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Synapses Display */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                  SYNAPTIC DATA FLOW (WHAT LINKS TO THIS NODE):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nodes
                    .filter((n) => n.id !== activeNode.id)
                    .map((other) => {
                      const isLinked = activeNode.connections.includes(other.id) || other.connections.includes(activeNode.id);
                      return (
                        <div
                          key={other.id}
                          onClick={() => setSelectedNodeId(other.id)}
                          className={`p-3 rounded-lg border font-mono text-xs cursor-pointer transition-colors ${
                            isLinked
                              ? "border-[#3b82f6]/40 bg-[#111111] text-white hover:border-[#3b82f6]"
                              : "border-[#1f1f1f] bg-[#0a0a0a] text-[#888888] opacity-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold truncate">{other.title}</span>
                            {isLinked ? (
                              <span className="text-[#10b981] text-[10px]">LINKED ⟷</span>
                            ) : (
                              <span className="text-[#888888] text-[10px]">INDIRECT</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#1f1f1f] flex items-center justify-between text-xs font-mono text-[#888888]">
              <span>PERSISTENCE: <span className="text-white">NEON POSTGRES + COGNEE</span></span>
              <span>UPDATED EVERY SESSION</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
