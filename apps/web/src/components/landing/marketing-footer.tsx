import Link from "next/link";
import { Logo } from "@/components/logo";
import { Terminal, ShieldCheck, Cpu, Github, Twitter } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#1f1f1f] bg-[#050505] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#1f1f1f]">
          <div className="md:col-span-4 space-y-4">
            <Logo size="sm" href="/" />
            <p className="text-xs font-mono text-[#888888] leading-relaxed max-w-sm">
              Autonomous job outreach workstation powered by Cognee persistent memory and Composio OAuth dispatch.
            </p>
            <div className="flex items-center gap-3 text-xs font-mono text-[#3b82f6]">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              SYSTEM TELEMETRY: 99.99% UPTIME
            </div>
          </div>

          <div className="md:col-span-2 space-y-3 font-mono text-xs">
            <div className="text-white font-bold tracking-wider uppercase">ARCHITECTURE</div>
            <ul className="space-y-2 text-[#888888]">
              <li><a href="#pipeline-terminal" className="hover:text-white transition-colors">CLI Terminal</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Serper Discovery</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Apollo Fallback</a></li>
              <li><a href="#cognee" className="hover:text-white transition-colors">Cognee Graph</a></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3 font-mono text-xs">
            <div className="text-white font-bold tracking-wider uppercase">WORKSTATION</div>
            <ul className="space-y-2 text-[#888888]">
              <li><Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/sign-up" className="hover:text-white transition-colors">Deploy Agent</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Specifications</Link></li>
              <li><Link href="/onboarding" className="hover:text-white transition-colors">Config Matrix</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3 font-mono text-xs">
            <div className="text-white font-bold tracking-wider uppercase">SECURITY &amp; COMPLIANCE</div>
            <div className="rounded border border-[#1f1f1f] bg-[#080808] p-4 text-[#888888] space-y-2">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-4 w-4 text-[#10b981]" />
                <span>Google OAuth 2.0 Verified</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                We never store raw Gmail passwords. All email dispatching is handled via strict OAuth scopes and encrypted token rotation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#888888]">
          <div>
            &copy; {new Date().getFullYear()} OUTPITCH INC. ALL RIGHTS RESERVED. // BUILT WITH COGNEE &amp; COMPOSIO.
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GITHUB</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">TWITTER // X</a>
            <span className="text-[#1f1f1f]">|</span>
            <span>BUILD v2.4.0-PROD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
