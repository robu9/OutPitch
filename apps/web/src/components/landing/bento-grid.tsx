import { Mail, Search, Database, Cpu, ShieldCheck, Zap, ArrowUpRight, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BentoGrid() {
  return (
    <section className="border-t border-[#1f1f1f] bg-[#050505] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            SECTION 05 // TECHNICAL ARCHITECTURE
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
            Built on world-class <span className="text-[#888888]">infrastructure.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
            We don't reinvent the wheel—we orchestrate the best developer APIs in the world into a unified autonomous job outreach loop.
          </p>
        </div>

        {/* ── ASYMMETRIC BENTO ARCHITECTURE GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Bento Item 1: Composio Gmail & LinkedIn (7 cols) */}
          <div className="md:col-span-7 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#2a2a2a] transition-all">
            <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none" aria-hidden />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
                    <Mail className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <span className="text-sm font-mono font-bold text-white">COMPOSIO INTEGRATION</span>
                </div>
                <Badge variant="primary">OAUTH 2.0 VERIFIED</Badge>
              </div>

              <h3 className="text-2xl font-semibold text-white tracking-tight mb-3">
                Direct Gmail &amp; LinkedIn Dispatch
              </h3>
              <p className="text-sm leading-relaxed text-[#888888] max-w-lg mb-6">
                No email forwarding hacks or sketchy SMTP relay servers. Outpitch connects directly to your Google Workspace or Gmail via OAuth using Composio. Drafts land straight in your drafts folder or send automatically with full reply tracking.
              </p>
            </div>

            <div className="rounded-lg border border-[#1f1f1f] bg-[#080808] p-4 font-mono text-xs text-[#d4d4d4] space-y-2">
              <div className="flex items-center justify-between text-[#888888]">
                <span>STATUS: <span className="text-[#10b981]">CONNECTED</span></span>
                <span>SCOPES: gmail.compose, gmail.readonly</span>
              </div>
              <div className="text-white">
                &gt; composio.gmail.createDraft(&#123; to: "sarah@anthropic.com", subject: "..." &#125;)
              </div>
            </div>
          </div>

          {/* Bento Item 2: Serper.dev Live Index (5 cols) */}
          <div className="md:col-span-5 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 flex flex-col justify-between group hover:border-[#2a2a2a] transition-all">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
                  <Search className="h-5 w-5 text-[#10b981]" />
                </div>
                <Badge variant="success">REAL-TIME INDEX</Badge>
              </div>

              <h3 className="text-xl font-semibold text-white tracking-tight mb-3">
                Serper.dev Hiring Signal Discovery
              </h3>
              <p className="text-sm leading-relaxed text-[#888888] mb-6">
                We query search indexes across Greenhouse, Lever, Ashby, and company career pages every hour. If a startup opens a role, Outpitch detects it days before it hits LinkedIn job boards.
              </p>
            </div>

            <div className="rounded border border-[#1f1f1f] bg-[#080808] p-3 text-xs font-mono text-[#888888] flex items-center justify-between">
              <span>AVG DISCOVERY SPEED:</span>
              <span className="text-white font-bold">&lt; 4 HOURS FROM POSTING</span>
            </div>
          </div>

          {/* Bento Item 3: Apollo.io Contact Fallback (5 cols) */}
          <div className="md:col-span-5 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 flex flex-col justify-between group hover:border-[#2a2a2a] transition-all">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
                  <Database className="h-5 w-5 text-[#f59e0b]" />
                </div>
                <Badge variant="warning">98% DELIVERABILITY</Badge>
              </div>

              <h3 className="text-xl font-semibold text-white tracking-tight mb-3">
                Apollo.io Contact Enrichment
              </h3>
              <p className="text-sm leading-relaxed text-[#888888] mb-6">
                When career pages don't list a hiring manager, our agent falls back to Apollo.io and Firecrawl to extract direct work emails for founders, engineering leads, and technical recruiters.
              </p>
            </div>

            <div className="rounded border border-[#1f1f1f] bg-[#080808] p-3 text-xs font-mono text-[#888888] flex items-center justify-between">
              <span>ENRICHMENT RATE:</span>
              <span className="text-white font-bold">94.2% SUCCESSFUL</span>
            </div>
          </div>

          {/* Bento Item 4: Gemini 3 Pro Tone Engine (7 cols) */}
          <div className="md:col-span-7 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#2a2a2a] transition-all">
            <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none" aria-hidden />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
                    <Cpu className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <span className="text-sm font-mono font-bold text-white">REASONING MODEL</span>
                </div>
                <Badge variant="primary">GEMINI 3 PRO</Badge>
              </div>

              <h3 className="text-2xl font-semibold text-white tracking-tight mb-3">
                High-Speed Technical Reasoning
              </h3>
              <p className="text-sm leading-relaxed text-[#888888] max-w-lg mb-6">
                We leverage Google's flagship Gemini 3 Pro model to analyze company engineering blogs and technical documentation. It writes outreach that sounds like a peer Staff Engineer—not a marketer using ChatGPT.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="rounded bg-[#080808] border border-[#1f1f1f] p-3">
                <div className="text-[#888888]">LATENCY</div>
                <div className="text-white font-bold mt-1">~1.2s / DRAFT</div>
              </div>
              <div className="rounded bg-[#080808] border border-[#1f1f1f] p-3">
                <div className="text-[#888888]">CONTEXT WINDOW</div>
                <div className="text-white font-bold mt-1">2M TOKENS</div>
              </div>
              <div className="rounded bg-[#080808] border border-[#1f1f1f] p-3 col-span-2 sm:col-span-1">
                <div className="text-[#888888]">HALLUCINATION RATE</div>
                <div className="text-[#10b981] font-bold mt-1">&lt; 0.1% VERIFIED</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
