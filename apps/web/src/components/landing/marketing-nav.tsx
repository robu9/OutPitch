"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#pipeline-terminal", label: "Demo" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#cognee", label: "Memory" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="nav-glass sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Marketing">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-sm">
                Sign in
              </Button>
            </SignInButton>
            <Link href="/sign-up">
              <Button size="sm" className="h-8 px-3.5 text-xs font-bold">
                Start free
                <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/chat">
              <Button size="sm" className="h-8 px-3.5 text-xs font-bold">
                Open app
                <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
