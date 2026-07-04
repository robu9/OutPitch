"use client";

import { useState } from "react";
import { Radar, ShieldCheck, Zap, AlertTriangle, CheckCircle2, Sliders, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function InteractiveDemo() {
  const [signalSource, setSignalSource] = useState<"serper" | "jobboards">("serper");
  const [contactMode, setContactMode] = useState<"enriched" | "manual">("enriched");
  const [memoryMode, setMemoryMode] = useState<"cognee" | "none">("cognee");

  const isAllOptimized = signalSource === "serper" && contactMode === "enriched" && memoryMode === "cognee";

  // Calculate dynamic metrics
  const accuracy = signalSource === "serper" ? (contactMode === "enriched" ? 98.4 : 82.0) : 34.1;
  const timeSaved = signalSource === "serper" ? (memoryMode === "cognee" ? "12.5 hrs/wk" : "8.0 hrs/wk") : "1.2 hrs/wk";
  const replyRate = memoryMode === "cognee" ? (contactMode === "enriched" ? "34.2%" : "21.5%") : "8.1%";

  return (
    <section className="border-t border-[#1f1f1f] bg-[#0b0b0b] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
              <Sliders className="h-3.5 w-3.5" />
              SECTION 02 // INTERACTIVE FILTER PLAYGROUND
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
              Why signal search beats <span className="text-[#888888]">job boards.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
              Job boards are flooded with ghost jobs, recruiter spam, and stale listings. Toggle the telemetry switches below to see how Outpitch filters noise into high-probability engineering interviews.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded border border-[#1f1f1f] bg-[#111111] p-1.5 text-xs font-mono text-[#888888]">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            LIVE SIMULATION ENGINE
          </div>
        </div>

        {/* ── INTERACTIVE TOGGLE MATRIX & TELEMETRY SCORECARD ── */}
        <div className="mt-16 grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Interactive Telemetry Switches (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* Toggle 1: Signal Source */}
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-6 transition-colors hover:border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Radar className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-white font-mono">01. DISCOVERY SIGNAL SOURCE</span>
                </div>
                <Badge variant={signalSource === "serper" ? "primary" : "warning"}>
                  {signalSource === "serper" ? "REAL-TIME HIRING" : "STALE LISTINGS"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSignalSource("serper")}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all duration-150 ${
                    signalSource === "serper"
                      ? "border-[#3b82f6] bg-[#080808] text-white shadow-sm"
                      : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-mono font-bold text-white">Serper.dev + Career Crawling</span>
                    {signalSource === "serper" && <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />}
                  </div>
                  <span className="text-xs text-[#888888] leading-relaxed">
                    Scans live search index &amp; career pages for roles posted in the last 7 days.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSignalSource("jobboards")}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all duration-150 ${
                    signalSource === "jobboards"
                      ? "border-[#f59e0b] bg-[#080808] text-white shadow-sm"
                      : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-mono font-bold text-white">Traditional Job Boards</span>
                    {signalSource === "jobboards" && <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />}
                  </div>
                  <span className="text-xs text-[#888888] leading-relaxed">
                    30+ day old listings, ghost jobs, and 1,000+ applicants per role.
                  </span>
                </button>
              </div>
            </div>

            {/* Toggle 2: Contact Discovery */}
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-6 transition-colors hover:border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-white font-mono">02. DECISION-MAKER ENRICHMENT</span>
                </div>
                <Badge variant={contactMode === "enriched" ? "primary" : "warning"}>
                  {contactMode === "enriched" ? "VERIFIED EMAILS" : "MANUAL SEARCH"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContactMode("enriched")}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all duration-150 ${
                    contactMode === "enriched"
                      ? "border-[#3b82f6] bg-[#080808] text-white shadow-sm"
                      : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-mono font-bold text-white">Apollo.io + Crawled Fallback</span>
                    {contactMode === "enriched" && <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />}
                  </div>
                  <span className="text-xs text-[#888888] leading-relaxed">
                    Auto-extracts direct emails for Founders, VPs of Eng, and Recruiters.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setContactMode("manual")}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all duration-150 ${
                    contactMode === "manual"
                      ? "border-[#f59e0b] bg-[#080808] text-white shadow-sm"
                      : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-mono font-bold text-white">Manual LinkedIn Stalking</span>
                    {contactMode === "manual" && <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />}
                  </div>
                  <span className="text-xs text-[#888888] leading-relaxed">
                    Copy-pasting names, guessing email formats, and hitting paywalls.
                  </span>
                </button>
              </div>
            </div>

            {/* Toggle 3: Outreach Memory */}
            <div className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-6 transition-colors hover:border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-white font-mono">03. OUTREACH PERSONALIZATION</span>
                </div>
                <Badge variant={memoryMode === "cognee" ? "primary" : "warning"}>
                  {memoryMode === "cognee" ? "COGNEE GRAPH" : "ZERO MEMORY"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMemoryMode("cognee")}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all duration-150 ${
                    memoryMode === "cognee"
                      ? "border-[#3b82f6] bg-[#080808] text-white shadow-sm"
                      : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-mono font-bold text-white">Cognee Compounding Memory</span>
                    {memoryMode === "cognee" && <CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />}
                  </div>
                  <span className="text-xs text-[#888888] leading-relaxed">
                    Remembers your experience, tone, and past rejections across every session.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemoryMode("none")}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all duration-150 ${
                    memoryMode === "none"
                      ? "border-[#f59e0b] bg-[#080808] text-white shadow-sm"
                      : "border-[#1f1f1f] bg-[#111111] text-[#888888] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-mono font-bold text-white">Generic ChatGPT Templates</span>
                    {memoryMode === "none" && <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />}
                  </div>
                  <span className="text-xs text-[#888888] leading-relaxed">
                    "I am writing to express my strong interest..." that recruiters delete instantly.
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Telemetry Scorecard & Comparison Box (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-[#2a2a2a] bg-[#080808] p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-6">
                <span className="text-xs font-mono text-[#888888]">TELEMETRY SCORECARD</span>
                <span className="text-xs font-mono text-[#3b82f6]">REAL-TIME CALCULATION</span>
              </div>

              {/* Metrics Display */}
              <div className="grid grid-cols-3 gap-4 pb-6 border-b border-[#1f1f1f]">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight">
                    {accuracy}%
                  </div>
                  <div className="text-[11px] font-mono text-[#888888] mt-1">SIGNAL ACCURACY</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums tracking-tight">
                    {replyRate}
                  </div>
                  <div className="text-[11px] font-mono text-[#888888] mt-1">EST. REPLY RATE</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[#10b981] tabular-nums tracking-tight">
                    {timeSaved}
                  </div>
                  <div className="text-[11px] font-mono text-[#888888] mt-1">TIME SAVED</div>
                </div>
              </div>

              {/* Live Preview Comparison Box */}
              <div className="mt-6 space-y-4">
                <div className="text-xs font-mono text-[#888888] uppercase tracking-wider">
                  SIMULATED DISCOVERY OUTPUT:
                </div>

                {isAllOptimized ? (
                  <div className="rounded-lg border border-[#10b981]/30 bg-[#10b981]/5 p-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-[#10b981] font-bold">✓ HIGH-PROBABILITY SIGNAL</span>
                      <Badge variant="success">98% COGNEE FIT</Badge>
                    </div>
                    <p className="text-xs font-mono text-white leading-relaxed">
                      <strong>Company:</strong> Vercel (Series D)<br />
                      <strong>Signal:</strong> Posted "Senior Frontend Architect" 4 hrs ago on careers page.<br />
                      <strong>Contact:</strong> Guillermo R. (CEO) &lt;guillermo@vercel.com&gt;<br />
                      <strong>Action:</strong> AI draft tailored with your Next.js performance benchmarks ready.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-[#f59e0b] font-bold">⚠ SUB-OPTIMAL NOISE</span>
                      <Badge variant="warning">LOW CONFIDENCE</Badge>
                    </div>
                    <p className="text-xs font-mono text-[#d4d4d4] leading-relaxed">
                      <strong>Company:</strong> Generic Corp (Unknown)<br />
                      <strong>Signal:</strong> Job board listing reposted 42 days ago (likely closed/ghost job).<br />
                      <strong>Contact:</strong> generic-hr-inbox@company.com (unverified).<br />
                      <strong>Action:</strong> Standard cover letter template required. High risk of rejection.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#1f1f1f]">
              <div className="flex items-center justify-between text-xs font-mono text-[#888888] mb-4">
                <span>OPTIMIZATION STATUS:</span>
                <span className={isAllOptimized ? "text-[#10b981] font-bold" : "text-[#f59e0b]"}>
                  {isAllOptimized ? "MAXIMUM PERFORMANCE" : "PARTIAL / NOISE DETECTED"}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setSignalSource("serper");
                  setContactMode("enriched");
                  setMemoryMode("cognee");
                }}
                className="w-full rounded-md bg-white px-4 py-3 text-xs font-mono font-bold text-black transition-all hover:bg-[#e0e0e0] flex items-center justify-center gap-2 shadow-sm"
              >
                {isAllOptimized ? "CONFIGURED FOR MAX SIGNAL" : "OPTIMIZE ALL SWITCHES TO OUTPITCH MODE"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
