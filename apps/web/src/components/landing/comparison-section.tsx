import { Check, X, ShieldAlert, Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const comparisonRows = [
  {
    feature: "Discovery Mechanism",
    oldWay: "Manual browsing on LinkedIn & generic ATS queues with 1,000+ applicants.",
    outpitch: "Real-time Serper hiring signal detection days before roles hit job boards.",
    advantage: "10x Faster Signal",
  },
  {
    feature: "Target Recipient",
    oldWay: "Submitting into generic 'careers@company.com' or ATS black holes.",
    outpitch: "Direct verified work emails for VP of Eng, Founders, and Tech Leads via Apollo.",
    advantage: "Direct Inbox Access",
  },
  {
    feature: "Outreach Craftsmanship",
    oldWay: "Robotic ChatGPT cover letters ('I am writing to express my strong interest...').",
    outpitch: "Peer-to-peer technical reasoning by Gemini 3 Pro matching candidate voice.",
    advantage: "Staff Eng Tone",
  },
  {
    id: "memory",
    feature: "System Memory",
    oldWay: "Zero memory. Every session resets; you repeat the same manual searches.",
    outpitch: "Cognee knowledge graph remembers tone, rejections, and profile nuances forever.",
    advantage: "Compounding Intelligence",
  },
  {
    feature: "Interview Conversion",
    oldWay: "1% – 3% average ATS response rate after hundreds of manual submissions.",
    outpitch: "18% – 34% direct reply rate from engineering leadership.",
    advantage: "3.4x Higher Conversion",
  },
];

export function ComparisonSection() {
  return (
    <section className="border-t border-[#1f1f1f] bg-[#0b0b0b] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            SECTION 06 // THE PARADIGM SHIFT
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
            Why traditional job search is <span className="text-[#888888]">broken.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
            Applying through standard ATS portals is an asymmetric battle against bots and resume parsers. Here is how Outpitch changes the math.
          </p>
        </div>

        {/* ── HIGH-CONTRAST DATA COMPARISON MATRIX ── */}
        <div className="rounded-xl border border-[#2a2a2a] bg-[#080808] overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-[#1f1f1f] bg-[#0d0d0d] text-xs font-mono font-bold">
            <div className="p-4 md:col-span-3 text-[#888888] border-b md:border-b-0 md:border-r border-[#1f1f1f]">
              WORKFLOW METRIC
            </div>
            <div className="p-4 md:col-span-4 text-[#ef4444] border-b md:border-b-0 md:border-r border-[#1f1f1f] flex items-center justify-between">
              <span>THE OLD WAY (MANUAL)</span>
              <X className="h-4 w-4" />
            </div>
            <div className="p-4 md:col-span-5 text-[#3b82f6] flex items-center justify-between bg-[#111111]">
              <span>THE OUTPITCH LOOP (AUTONOMOUS)</span>
              <Check className="h-4 w-4 text-[#10b981]" />
            </div>
          </div>

          <div className="divide-y divide-[#1f1f1f]">
            {comparisonRows.map((row, index) => (
              <div key={row.feature} className="grid grid-cols-1 md:grid-cols-12 text-sm transition-colors hover:bg-[#0c0c0c]">
                {/* Feature Name */}
                <div className="p-5 md:col-span-3 font-semibold text-white md:border-r border-[#1f1f1f] flex flex-col justify-between">
                  <span>{row.feature}</span>
                  <div className="mt-2 md:mt-0">
                    <Badge variant="muted">{row.advantage}</Badge>
                  </div>
                </div>

                {/* Old Way Column */}
                <div className="p-5 md:col-span-4 text-[#888888] md:border-r border-[#1f1f1f] bg-[#090909]/50 flex items-start gap-3 leading-relaxed">
                  <X className="h-4 w-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <span>{row.oldWay}</span>
                </div>

                {/* Outpitch Loop Column */}
                <div className="p-5 md:col-span-5 text-white bg-[#111111]/80 flex items-start gap-3 leading-relaxed font-medium">
                  <Check className="h-4 w-4 text-[#10b981] shrink-0 mt-0.5" />
                  <span>{row.outpitch}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-[#1f1f1f] bg-[#0b0b0b] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-[#888888]">
            <div>
              <span>TELEMETRY SOURCE: <strong className="text-white">OUTPITCH USER DATASET Q1 2026</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#10b981]">✓</span>
              <span>AVERAGE TIME SAVED: <strong className="text-white">12.5 HOURS / WEEK</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
