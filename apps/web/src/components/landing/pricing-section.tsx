import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    id: "scout",
    name: "Free",
    price: "$0",
    features: ["50 discoveries / mo", "10 contact enrichments", "Basic memory", "AI drafts"],
    cta: "Start free",
    href: "/sign-up",
    variant: "secondary" as const,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    popular: true,
    features: ["Unlimited discovery", "250 contacts / mo", "Full Cognee memory", "Gmail dispatch", "Reply tracking"],
    cta: "Get Pro",
    href: "/sign-up?plan=pro",
    variant: "primary" as const,
  },
  {
    id: "team",
    name: "Team",
    price: "$199",
    features: ["Everything in Pro", "1,500 contacts / mo", "Team workspaces", "Shared research", "API access"],
    cta: "Contact sales",
    href: "/sign-up?plan=team",
    variant: "secondary" as const,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-border bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Simple pricing
        </h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.popular
                  ? "border-accent bg-surface shadow-[0_24px_64px_-16px_var(--accent-glow)]"
                  : "border-border bg-[#080808]"
              }`}
            >
              {plan.popular && (
                <Badge variant="primary" className="self-start mb-3">Popular</Badge>
              )}

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold font-mono tabular-nums">{plan.price}</span>
                {plan.price !== "$0" && <span className="text-xs text-muted-foreground">/ mo</span>}
              </div>

              <div className="text-sm font-medium mb-4">{plan.name}</div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-subtle">
                    <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  size="lg"
                  variant={plan.variant}
                  className={`w-full h-10 text-sm ${plan.popular ? "font-bold" : ""}`}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
