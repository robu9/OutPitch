"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/motion/reveal";

const solutions = [
  {
    title: "Research-backed drafts",
    description: "Every email references real company signals and your stored profile.",
  },
  {
    title: "Persistent memory",
    description: "Cognee connects preferences, past outreach, and outcomes across sessions.",
  },
  {
    title: "Curated pipeline",
    description: "A focused list of high-fit companies — not thousands of irrelevant leads.",
  },
  {
    title: "Decision-maker targeting",
    description: "Contacts verified for role relevance, not scraped from generic directories.",
  },
];

export function HowSolves() {
  const reduced = useReducedMotion();

  return (
    <section data-section-reveal className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="How Outpitch solves it"
            description="Precision over volume. Memory over repetition. Outreach that compounds."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {solutions.map((s, i) => (
            <motion.div
              key={s.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated p-6 transition-colors hover:border-border-strong"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: i * 0.08,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={reduced ? undefined : { y: -2 }}
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface">
                <Check className="h-4 w-4 text-foreground" aria-hidden />
              </div>
              <h3 className="text-base font-medium text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-text-secondary text-pretty">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
