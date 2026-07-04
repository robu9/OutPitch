"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, ArrowRight, CheckCircle2, Cpu, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LandingCta() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      router.push(`/sign-up?email=${encodeURIComponent(email)}`);
    } else {
      router.push("/sign-up");
    }
  }

  return (
    <section className="border-t border-[#1f1f1f] bg-[#050505] py-24 md:py-32 relative overflow-hidden">
      <div className="dot-grid absolute inset-0 opacity-30 pointer-events-none" aria-hidden />
      
      <div className="relative mx-auto max-w-5xl px-5">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#080808] p-8 sm:p-12 md:p-16 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.95)] relative overflow-hidden">
          <div className="scanline absolute inset-0 opacity-15 pointer-events-none" aria-hidden />

          {/* Terminal Window Header */}
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 mb-8 text-xs font-mono text-[#888888]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-[#1f1f1f]" />
                <span className="h-3 w-3 rounded-full bg-[#1f1f1f]" />
                <span className="h-3 w-3 rounded-full bg-[#1f1f1f]" />
              </div>
              <span>outpitch-deploy — agent-installer</span>
            </div>
            <Badge variant="primary" pulse>SYSTEM READY</Badge>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-4">
              <Cpu className="h-3.5 w-3.5" />
              SECTION 09 // INITIALIZE AGENT WORKSTATION
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
              Stop applying manually. <br />
              <span className="text-[#888888]">Deploy your outreach agent.</span>
            </h2>

            <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty max-w-xl">
              Connect your Gmail, set your target roles, and let Cognee compound your intelligence across every high-velocity tech interview.
            </p>

            {/* CLI Command Box */}
            <div className="mt-8 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] p-4 font-mono text-xs sm:text-sm text-[#d4d4d4] flex items-center gap-3 shadow-inner">
              <span className="text-[#3b82f6] font-bold">&gt;</span>
              <span className="text-white">npx @outpitch/agent init --memory="cognee" --inbox="oauth"</span>
            </div>

            {/* Interactive Email Capture Form */}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row items-stretch gap-3 max-w-lg">
              <input
                type="email"
                placeholder="Enter your email to deploy workstation..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 flex-1 rounded-md border border-[#2a2a2a] bg-[#111111] px-4 text-sm text-white placeholder:text-[#888888] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] font-mono"
              />
              <Button type="submit" size="lg" className="h-12 px-6 text-sm font-mono shrink-0 bg-white text-black hover:bg-[#e0e0e0] font-bold">
                Deploy Workstation <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            {/* Guarantee Specifications */}
            <div className="mt-8 pt-6 border-t border-[#1f1f1f] flex flex-wrap items-center gap-6 text-xs font-mono text-[#888888]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
                <span>Direct Gmail OAuth 2.0</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
                <span>Cognee Persistent Graph</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
                <span>Zero Spam Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
