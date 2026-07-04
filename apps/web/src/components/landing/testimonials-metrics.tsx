import { TrendingUp, ShieldCheck } from "lucide-react";

export function TestimonialsMetrics() {
  return (
    <section className="border-t border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Results from real users
        </h2>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 border-y border-border py-8">
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums">14k+</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Verified emails
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums">34%</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              Avg reply rate
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums text-accent">48k+</div>
            <div className="text-xs text-muted-foreground mt-1">Memory nodes stored</div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <blockquote className="rounded-xl border border-border bg-background-secondary p-6">
            <p className="text-subtle leading-relaxed">
              "Found a Perplexity opening before LinkedIn, got the VP's email, and landed an interview in 4 hours."
            </p>
            <footer className="mt-4 text-sm">
              <span className="font-medium">Alex Chen</span>
              <span className="text-muted-foreground"> · Staff Frontend</span>
            </footer>
          </blockquote>

          <blockquote className="rounded-xl border border-border bg-background-secondary p-6">
            <p className="text-subtle leading-relaxed">
              "Cognee remembers my stack and tone. It's the only AI tool I trust to send from my Gmail."
            </p>
            <footer className="mt-4 text-sm">
              <span className="font-medium">Elena Rostova</span>
              <span className="text-muted-foreground"> · Founding Engineer</span>
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
