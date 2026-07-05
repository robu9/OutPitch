"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ensureGsap, gsap, useGSAP } from "@/lib/gsap-config";
import { cn } from "@/lib/utils";

const links = [
  { href: "#demo", label: "Demo" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useGSAP(
    () => {
      ensureGsap();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const nav = navRef.current;
      const header = headerRef.current;
      if (!nav || !header) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(header, { y: -32, opacity: 0, duration: 0.75 });
      tl.from(
        nav.querySelectorAll("[data-nav-item]"),
        { y: -10, opacity: 0, duration: 0.45, stagger: 0.06 },
        "-=0.4"
      );
    },
    { scope: headerRef }
  );

  return (
    <header
      ref={headerRef}
      className="sticky top-6 z-[var(--z-sticky)] mx-4 flex justify-center transition-all duration-300 md:mx-0"
    >
      <div
        className={cn(
          "nav-shell relative w-full",
          scrolled ? "max-w-[50rem]" : "max-w-[70rem]"
        )}
      >
        <nav
          ref={navRef}
          className={cn(
            "nav-pill flex w-full items-center justify-between transition-all duration-300",
            scrolled
              ? "nav-scrolled h-11 rounded-full px-3 py-2 md:px-4"
              : "h-14 rounded-2xl px-5 md:px-8"
          )}
          aria-label="Main"
        >
        <div data-nav-item>
          <Logo size="sm" />
        </div>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.href} data-nav-item>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-text-secondary transition-colors hover:text-[var(--accent-blue)]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <SignedOut>
            <div data-nav-item>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
            </div>
            <div data-nav-item>
              <Link href="/sign-up">
                <Button variant="accent" size="sm">
                  Get started
                </Button>
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            <div data-nav-item>
              <Link href="/chat">
                <Button variant="accent" size="sm">
                  Go to app
                </Button>
              </Link>
            </div>
          </SignedIn>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

        <div
          className={cn(
            "absolute top-full mt-2 w-full rounded-2xl border border-border bg-bg-elevated p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all md:hidden",
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          )}
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <SignedOut>
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                <Button variant="outline" size="md" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link href="/sign-up" onClick={() => setOpen(false)}>
                <Button variant="accent" size="md" className="w-full">
                  Get started
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/chat" onClick={() => setOpen(false)}>
                <Button variant="accent" size="md" className="w-full">
                  Go to app
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}
