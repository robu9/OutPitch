import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GsapReveal } from "@/components/motion/gsap-reveal";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section data-section-reveal className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <GsapReveal>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--accent-blue)]/20 bg-bg-elevated px-8 py-16 text-center md:px-16 md:py-20">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
            >
              <div className="hero-radial absolute inset-0 opacity-60" />
              <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-[var(--accent-blue-glow)] blur-3xl" />
            </div>

            <h2 className="relative text-3xl font-medium tracking-tight text-foreground text-balance sm:text-4xl">
              Start outreach that remembers you
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-base text-text-secondary text-pretty">
              Join job seekers who replaced spray-and-pray with focused,
              memory-powered outreach.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sign-up">
                <Button variant="accent" size="lg">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </GsapReveal>
      </div>
    </section>
  );
}
