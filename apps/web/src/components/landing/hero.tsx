"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GsapReveal } from "@/components/motion/gsap-reveal";

const pipelineSteps = [
  { label: "Discover", status: "3 companies matched" },
  { label: "Research", status: "VP Eng profile found" },
  { label: "Draft", status: "Personalized email ready" },
  { label: "Send", status: "Awaiting approval" },
];

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section
      className="relative w-full overflow-hidden pt-12 pb-8 md:pt-16 md:pb-12"
    >
      <div className="relative mx-auto max-w-5xl px-5 text-center md:px-8">
        <GsapReveal immediate>
          <Badge
            variant="outline"
            className="mb-6 gap-1.5 border-[var(--accent-blue-soft)]/40 bg-[var(--accent-blue-glow)] px-3 py-1 text-[var(--accent-blue)]"
          >
            <Layers className="h-3 w-3" aria-hidden />
            Outreach that remembers you
          </Badge>
        </GsapReveal>

        <GsapReveal delay={0.05} immediate>
          <h1 className="text-4xl font-medium tracking-[-0.03em] text-foreground text-balance sm:text-5xl md:text-6xl md:leading-[1.08]">
            Land your next role
            <br />
            with intelligent outreach
          </h1>
        </GsapReveal>

        <GsapReveal delay={0.1} immediate>
          <p className="mx-auto mt-5 max-w-xl text-base text-text-secondary text-pretty sm:text-lg">
            Outpitch finds companies hiring for your role, surfaces the right
            contacts, and drafts outreach that gets better every session — powered
            by persistent memory.
          </p>
        </GsapReveal>

        <GsapReveal delay={0.15} immediate>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button variant="accent" size="lg" className="btn-accent-glow">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="outline" size="lg">
                See it in action
              </Button>
            </a>
          </div>
        </GsapReveal>
      </div>

      <GsapReveal delay={0.2} immediate className="relative mx-auto mt-14 max-w-5xl px-4 md:px-8">
        <div
          data-float-card
          className="surface-card overflow-hidden rounded-2xl md:rounded-3xl"
        >
          <div className="flex items-center gap-2 border-b border-border bg-bg-base px-4 py-3">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--window-dot)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--window-dot)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--window-dot)]" />
            </div>
            <span className="ml-2 text-xs text-text-secondary">
              Outpitch — Active search
            </span>
          </div>

          <div className="grid gap-0 md:grid-cols-[1fr_280px]">
            <div className="border-b border-border bg-bg-base p-5 md:border-b-0 md:border-r">
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Your request
              </p>
              <p className="mt-2 text-sm text-foreground">
                Find Series A–C startups hiring frontend engineers in NYC. Draft
                outreach to engineering leaders.
              </p>

              <div className="mt-6 space-y-3">
                {pipelineSteps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg-surface px-4 py-3"
                    initial={reduced ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.4 + i * 0.15,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--accent-blue)]/30 bg-[var(--accent-blue-glow)] text-[10px] font-medium text-[var(--accent-blue)]">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {step.label}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {step.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-bg-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Memory context
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Target: Staff Frontend Engineer",
                  "Prefers remote-first startups",
                  "Previous: 2 replies from fintech",
                ].map((item, i) => (
                  <motion.div
                    key={item}
                    className="rounded-lg border border-border bg-bg-base px-3 py-2 text-xs text-text-secondary"
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-text-secondary">
                Cognee recalls your preferences across every session.
              </p>
            </div>
          </div>
        </div>
      </GsapReveal>
    </section>
  );
}
