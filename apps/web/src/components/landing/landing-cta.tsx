"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(email ? `/sign-up?email=${encodeURIComponent(email)}` : "/sign-up");
  }

  return (
    <section className="border-t border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Stop applying manually
        </h2>
        <p className="mt-3 text-muted-foreground">
          Connect Gmail, set your target role, start outreach in minutes.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 flex-1 rounded-md border border-border-strong bg-surface px-4 text-sm text-white placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button type="submit" size="lg" className="h-11 px-6 shrink-0 font-bold">
            Get started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">Free tier · No credit card</p>
      </div>
    </section>
  );
}
