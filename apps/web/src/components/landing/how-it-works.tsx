"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, SectionHeading } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "profile",
    title: "Share your target",
    description:
      "Tell Outpitch your role, preferences, and constraints. Cognee stores this as structured memory — not a one-time prompt.",
    visual: (
      <div className="space-y-3 p-6">
        {["Role: Staff Frontend Engineer", "Stage: Series A–C", "Location: Remote US"].map(
          (line) => (
            <div
              key={line}
              className="rounded-lg border border-border bg-bg-surface px-4 py-3 text-sm text-foreground"
            >
              {line}
            </div>
          )
        )}
      </div>
    ),
  },
  {
    id: "discover",
    title: "Discover hiring signals",
    description:
      "Real-time search surfaces companies actively hiring for your role — ranked by fit, not random job boards.",
    visual: (
      <div className="p-6 space-y-2">
        {[
          { name: "Retool", score: 92 },
          { name: "Linear", score: 87 },
          { name: "Vercel", score: 84 },
        ].map((co) => (
          <div
            key={co.name}
            className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3"
          >
            <span className="text-sm text-foreground">{co.name}</span>
            <span className="text-xs text-text-secondary">{co.score}% match</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "contacts",
    title: "Find decision-makers",
    description:
      "Verified contacts at each company — engineering leaders, hiring managers, and recruiters worth reaching.",
    visual: (
      <div className="p-6 space-y-2">
        {[
          { name: "Sarah Chen", title: "VP Engineering" },
          { name: "Marcus Webb", title: "Head of Talent" },
        ].map((c) => (
          <div
            key={c.name}
            className="rounded-lg border border-border bg-bg-surface px-4 py-3"
          >
            <p className="text-sm text-foreground">{c.name}</p>
            <p className="text-xs text-text-secondary">{c.title}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "outreach",
    title: "Send personalized outreach",
    description:
      "Drafts reference your background, company research, and past conversations. You approve every send.",
    visual: (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary leading-relaxed">
          Hi Sarah — I noticed Retool&apos;s recent design system work aligns with my
          background building component libraries at scale. I&apos;d love to explore
          staff-level frontend opportunities...
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const observers = sectionRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(i);
        },
        { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
      );
      obs.observe(el);
      return obs;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, [reduced]);

  return (
    <section id="how-it-works" data-section-reveal className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="How Outpitch works"
            description="Four steps from intent to inbox — each one informed by memory that compounds."
          />
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[280px_1fr]">
          <div className="hidden lg:block">
            <div className="sticky top-32 space-y-1">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() =>
                    sectionRefs.current[i]?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  className={cn(
                    "block w-full rounded-lg px-4 py-3 text-left text-sm transition-colors",
                    active === i
                      ? "bg-bg-surface text-foreground"
                      : "text-text-secondary hover:text-foreground"
                  )}
                >
                  <span className="mr-2 text-text-secondary">{i + 1}.</span>
                  {step.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-24">
            {steps.map((step, i) => (
              <div
                key={step.id}
                ref={(el) => {
                  sectionRefs.current[i] = el;
                }}
              >
                <Reveal>
                  <h3 className="text-xl font-medium text-foreground lg:hidden">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm text-text-secondary text-pretty lg:mt-0">
                    {step.description}
                  </p>
                  <motion.div
                    className="mt-6 overflow-hidden rounded-2xl border border-border bg-bg-elevated"
                    initial={false}
                    animate={{
                      opacity: active === i || reduced ? 1 : 0.5,
                      scale: active === i || reduced ? 1 : 0.98,
                    }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {step.visual}
                  </motion.div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
