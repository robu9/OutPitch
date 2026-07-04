import { Quote, Terminal, CheckCircle2, TrendingUp, ShieldCheck, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TestimonialsMetrics() {
  return (
    <section className="border-t border-[#1f1f1f] bg-[#050505] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            SECTION 07 // VERIFIED PROOF
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
            Trusted by serious <span className="text-[#888888]">engineers.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
            We don't do fake review stars or generic marketing badges. Here is what engineers say after replacing their manual job search with autonomous outreach.
          </p>
        </div>

        {/* ── LIVE TELEMETRY METRICS BANNER ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 border-y border-[#1f1f1f] py-10 bg-[#080808]">
          <div className="px-6 border-b sm:border-b-0 sm:border-r border-[#1f1f1f] pb-6 sm:pb-0">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-white tabular-nums tracking-tight">
              14,200+
            </div>
            <div className="text-xs font-mono text-[#888888] mt-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#3b82f6]" />
              VERIFIED DECISION-MAKER EMAILS
            </div>
          </div>

          <div className="px-6 border-b sm:border-b-0 sm:border-r border-[#1f1f1f] pb-6 sm:pb-0">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-white tabular-nums tracking-tight">
              34.2%
            </div>
            <div className="text-xs font-mono text-[#888888] mt-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#10b981]" />
              AVG DIRECT REPLY RATE
            </div>
          </div>

          <div className="px-6">
            <div className="text-3xl sm:text-4xl font-bold font-mono text-[#3b82f6] tabular-nums tracking-tight">
              48,000+
            </div>
            <div className="text-xs font-mono text-[#888888] mt-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#3b82f6]" />
              COGNEE MEMORY NODES COMPOUNDED
            </div>
          </div>
        </div>

        {/* ── ARCHITECTURAL CASE STUDIES / EDITORIAL QUOTE BLOCKS ── */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Quote Block 1 */}
          <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 flex flex-col justify-between relative group hover:border-[#2a2a2a] transition-all">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1f1f1f] text-xs font-mono text-[#888888]">
                <span>CASE STUDY // STAFF FRONTEND</span>
                <Badge variant="success">INTERVIEW CONVERTED</Badge>
              </div>

              <blockquote className="text-base sm:text-lg leading-relaxed text-white font-medium mb-6 text-pretty">
                "I was spending 15 hours a week sending applications into Greenhouse queues and getting zero responses. Outpitch found a Staff Eng opening at Perplexity 3 days before it hit LinkedIn, crawled the VP's email, and generated a letter mentioning my websocket latency work. I got an interview call in 4 hours."
              </blockquote>
            </div>

            <div className="pt-6 border-t border-[#1f1f1f] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm">Alex Chen</div>
                <div className="text-xs font-mono text-[#888888]">Staff Frontend Engineer (Formerly Stripe)</div>
              </div>
              <div className="text-right font-mono text-xs text-[#3b82f6]">
                &gt; outpitch.verify()
              </div>
            </div>
          </div>

          {/* Quote Block 2 */}
          <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-8 flex flex-col justify-between relative group hover:border-[#2a2a2a] transition-all">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1f1f1f] text-xs font-mono text-[#888888]">
                <span>CASE STUDY // FOUNDING FULLSTACK</span>
                <Badge variant="primary">COGNEE ADVANTAGE</Badge>
              </div>

              <blockquote className="text-base sm:text-lg leading-relaxed text-white font-medium mb-6 text-pretty">
                "What sold me was Cognee. Every other AI tool writes robotic cover letters that sound like ChatGPT. Outpitch remembered my specific Rust &amp; Next.js background across sessions and tailored the tone to sound like an engineering founder. It's the only AI tool I trust to send from my Gmail."
              </blockquote>
            </div>

            <div className="pt-6 border-t border-[#1f1f1f] flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm">Elena Rostova</div>
                <div className="text-xs font-mono text-[#888888]">Founding Engineer (DevTools Startup)</div>
              </div>
              <div className="text-right font-mono text-xs text-[#3b82f6]">
                &gt; outpitch.verify()
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
