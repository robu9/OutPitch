"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Terminal } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#pipeline-terminal", label: "Terminal" },
  { href: "#how-it-works", label: "Workflow" },
  { href: "#cognee", label: "Cognee Graph" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="nav-glass sticky top-0 z-[var(--z-sticky)] border-b border-[#1f1f1f] bg-[#050505]/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Marketing">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-mono uppercase tracking-wider text-[#888888] transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 border-r border-[#1f1f1f] pr-3 text-[11px] font-mono text-[#888888]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            <span>SYS: <span className="text-white">ONLINE</span></span>
          </div>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-xs font-mono text-[#888888] hover:text-white">
                Sign in
              </Button>
            </SignInButton>
            <Link href="/sign-up">
              <Button size="sm" className="h-8 px-3.5 text-xs font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold">
                Deploy Agent
                <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/chat">
              <Button size="sm" className="h-8 px-3.5 text-xs font-mono bg-white text-black hover:bg-[#e0e0e0] font-bold">
                Workstation
                <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
