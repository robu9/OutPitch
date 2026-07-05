"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    description: "Explore Outpitch and run your first outreach",
    monthly: 0,
    yearly: 0,
    features: [
      "10 company discoveries / month",
      "5 personalized drafts",
      "Basic Cognee memory",
      "Email support",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For active job seekers running a full search",
    monthly: 29,
    yearly: 24,
    features: [
      "Unlimited discoveries",
      "Unlimited drafts & sends",
      "Full Cognee knowledge graph",
      "Priority contact resolution",
      "Pipeline analytics",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Team",
    description: "Career coaches and bootcamps supporting multiple seekers",
    monthly: 99,
    yearly: 79,
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "Shared playbooks",
      "Admin dashboard",
      "Dedicated support",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" data-section-reveal className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="Pricing that scales with your search"
            description="Start free. Upgrade when you're ready to run a serious outreach campaign."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-bg-elevated p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                !yearly
                  ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]"
                  : "text-text-secondary hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                yearly
                  ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]"
                  : "text-text-secondary hover:text-foreground"
              )}
            >
              Yearly
              <span className="ml-1 text-xs opacity-70">−20%</span>
            </button>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} data-stagger-item>
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-6",
                  plan.highlighted
                    ? "border-[var(--accent-blue)]/40 bg-bg-base shadow-[var(--btn-accent-glow)]"
                    : "border-border bg-bg-elevated"
                )}
              >
                {plan.highlighted && (
                  <span className="mb-4 inline-flex w-fit rounded-full border border-[var(--accent-blue)]/30 bg-[var(--accent-blue-glow)] px-2.5 py-0.5 text-xs text-[var(--accent-blue)]">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-medium text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-medium text-foreground">
                    ${yearly ? plan.yearly : plan.monthly}
                  </span>
                  {plan.monthly > 0 && (
                    <span className="text-sm text-text-secondary">/mo</span>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-blue)]" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="mt-8 block">
                  <Button
                    variant={plan.highlighted ? "accent" : "outline"}
                    className={cn("w-full", plan.highlighted && "btn-accent-glow")}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
