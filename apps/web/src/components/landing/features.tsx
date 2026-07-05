"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/motion/reveal";

const features = [
  {
    icon: Search,
    title: "Hiring signal discovery",
    description: "Real-time search finds companies actively hiring for your target role.",
    span: "col-span-1 row-span-1",
    demo: (
      <div className="mt-4 space-y-2">
        {["Series B fintech", "Remote-first SaaS", "NYC hybrid"].map((t) => (
          <div
            key={t}
            className="rounded-lg border border-border bg-bg-base px-3 py-2 text-xs text-text-secondary"
          >
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Building2,
    title: "Company pipeline",
    description: "Ranked matches with research, contacts, and outreach status in one view.",
    span: "col-span-1 row-span-1 md:col-span-1",
    demo: (
      <div className="mt-4 flex gap-2">
        {["Retool", "Linear", "Stripe"].map((n, i) => (
          <div
            key={n}
            className="flex-1 rounded-lg border border-border bg-bg-base py-4 text-center text-xs text-foreground"
            style={{ opacity: 1 - i * 0.15 }}
          >
            {n}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Mail,
    title: "Personalized drafts",
    description: "Emails that reference your background and each company's recent signals.",
    span: "col-span-1 md:col-span-2",
    demo: (
      <div className="mt-4 rounded-lg border border-border bg-bg-base p-4 text-xs text-text-secondary leading-relaxed">
        Referenced your design systems work and their Q1 engineering blog post...
      </div>
    ),
  },
  {
    icon: MessageSquare,
    title: "Conversational agent",
    description: "Refine your search, ask questions, and approve sends through natural chat.",
    span: "col-span-1",
    demo: null,
  },
  {
    icon: Sparkles,
    title: "Memory that compounds",
    description: "Cognee links profile, preferences, and outcomes into a growing knowledge graph.",
    span: "col-span-1",
    demo: null,
  },
  {
    icon: TrendingUp,
    title: "Outcome tracking",
    description: "See what's working. Feedback trains better recommendations over time.",
    span: "col-span-1 md:col-span-2",
    demo: (
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Sent", val: "24" },
          { label: "Replies", val: "8" },
          { label: "Interviews", val: "3" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-bg-base py-3 text-center"
          >
            <p className="text-lg font-medium text-foreground">{s.val}</p>
            <p className="text-[10px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export function Features() {
  const reduced = useReducedMotion();

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="Everything you need for focused outreach"
            description="One product for discovery, research, drafting, and tracking — designed for job seekers, not sales teams."
          />
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className={`rounded-2xl border border-border bg-bg-elevated p-6 transition-colors hover:border-border-strong ${f.span}`}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: i * 0.05,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <f.icon className="h-5 w-5 text-foreground" aria-hidden />
              <h3 className="mt-4 text-base font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-text-secondary text-pretty">
                {f.description}
              </p>
              {f.demo}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
