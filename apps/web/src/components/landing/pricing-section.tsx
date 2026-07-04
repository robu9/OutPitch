import Link from "next/link";
import { Check, Sparkles, Terminal, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    id: "scout",
    name: "Scout / Starter",
    price: "$0",
    period: "forever",
    description: "For individual developers exploring autonomous job signal discovery.",
    badge: "FREE TIER",
    features: [
      "50 Serper hiring signal discoveries / mo",
      "10 Apollo verified contact enrichments / mo",
      "Basic Cognee memory graph (single session)",
      "Gemini 3 Pro outreach draft generation",
      "Manual draft copy & export",
    ],
    cta: "Start for free",
    href: "/sign-up",
    variant: "secondary" as const,
  },
  {
    id: "pro",
    name: "Pro Workstation",
    price: "$49",
    period: "per month",
    description: "For serious engineers actively interviewing at high-velocity tech startups.",
    badge: "RECOMMENDED",
    popular: true,
    features: [
      "Unlimited Serper hiring signal discovery",
      "250 Apollo verified decision-maker emails / mo",
      "Compounding Cognee knowledge graph across unlimited sessions",
      "Composio Gmail & LinkedIn OAuth direct dispatch",
      "Priority Gemini 3 Pro high-speed reasoning",
      "Real-time reply tracking & follow-up queues",
    ],
    cta: "Deploy Workstation",
    href: "/sign-up?plan=pro",
    variant: "primary" as const,
  },
  {
    id: "team",
    name: "Autonomous Team",
    price: "$199",
    period: "per month",
    description: "For boutique recruiting agencies & specialized technical placement teams.",
    badge: "ENTERPRISE",
    features: [
      "Everything in Pro Workstation",
      "1,500 Apollo verified decision-maker contacts / mo",
      "Multi-inbox Composio rotation & team workspaces",
      "Shared Cognee company research knowledge graphs",
      "Custom API webhook export & CRM/ATS sync",
      "Dedicated Slack engineering support channel",
    ],
    cta: "Contact Sales",
    href: "/sign-up?plan=team",
    variant: "secondary" as const,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-[#1f1f1f] bg-[#0b0b0b] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#3b82f6] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            SECTION 08 // TRANSPARENT ARCHITECTURE
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl text-balance">
            Predictable pricing. <span className="text-[#888888]">Zero hidden fees.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#888888] text-pretty">
            Invest in your career infrastructure. One month of Pro Workstation pays for itself 300x over with a single Senior Engineering offer.
          </p>
        </div>

        {/* ── MINIMALIST MONOCHROME PRICING TABLE ── */}
        <div className="grid gap-8 lg:grid-cols-3 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-8 flex flex-col justify-between transition-all duration-200 ${
                plan.popular
                  ? "border-[#3b82f6] bg-[#111111] shadow-[0_24px_64px_-16px_rgba(59,130,246,0.15)] relative"
                  : "border-[#1f1f1f] bg-[#080808] hover:border-[#2a2a2a]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-8">
                  <Badge variant="primary" pulse>MOST POPULAR // WORKSTATION</Badge>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-mono font-bold text-white">{plan.name}</span>
                  {!plan.popular && <Badge variant="muted">{plan.badge}</Badge>}
                </div>

                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-bold font-mono text-white tracking-tight tabular-nums">
                    {plan.price}
                  </span>
                  <span className="text-xs font-mono text-[#888888]">/ {plan.period}</span>
                </div>

                <p className="text-xs text-[#888888] leading-relaxed mb-6 pb-6 border-b border-[#1f1f1f] min-h-[48px]">
                  {plan.description}
                </p>

                <div className="space-y-3 mb-8">
                  <div className="text-xs font-mono text-[#888888] uppercase tracking-wider mb-3">
                    INCLUDED SPECIFICATIONS:
                  </div>
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 text-xs text-[#d4d4d4]">
                      <Check className="h-3.5 w-3.5 text-[#10b981] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Link href={plan.href} className="w-full">
                  <Button
                    size="lg"
                    variant={plan.variant}
                    className={`w-full h-11 text-xs font-mono ${
                      plan.popular ? "bg-white text-black hover:bg-[#e0e0e0] font-bold shadow-md" : ""
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <div className="mt-3 text-center text-[11px] font-mono text-[#888888]">
                  {plan.id === "scout" ? "No credit card required" : "Cancel anytime with 1-click"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ & Enterprise Footer Note */}
        <div className="mt-16 rounded-xl border border-[#1f1f1f] bg-[#080808] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-white">
              <ShieldCheck className="h-5 w-5 text-[#10b981]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Need a custom enterprise SLA or API integration?</div>
              <div className="text-xs font-mono text-[#888888] mt-0.5">We offer dedicated Neon database isolation and custom Cognee training pipelines.</div>
            </div>
          </div>
          <Link href="/sign-up">
            <Button variant="secondary" size="sm" className="h-9 px-4 text-xs font-mono shrink-0">
              Contact Engineering <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
