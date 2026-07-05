import { X } from "lucide-react";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/motion/reveal";

const problems = [
  {
    title: "Generic templates",
    description:
      "Copy-paste emails get ignored. Recruiters spot automation instantly.",
  },
  {
    title: "No memory between sessions",
    description:
      "Every tool resets. You re-explain your background, preferences, and goals from scratch.",
  },
  {
    title: "Spray-and-pray volume",
    description:
      "Mass applications dilute your signal. Quality outreach takes research most people skip.",
  },
  {
    title: "Wrong contacts",
    description:
      "Reaching HR inboxes when engineering leaders make hiring decisions wastes your best shots.",
  },
];

export function WhyFails() {
  return (
    <section data-section-reveal className="border-y border-border bg-bg-elevated py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <SectionHeading
              align="left"
              title="Why AI outreach fails"
              description="Most tools optimize for volume. Job search rewards precision, context, and persistence."
            />
          </Reveal>

          <Stagger className="space-y-3" stagger={0.06}>
            {problems.map((p) => (
              <StaggerItem key={p.title}>
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-base p-5 transition-colors hover:border-border-strong hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-surface">
                    <X className="h-4 w-4 text-text-secondary" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{p.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary text-pretty">
                      {p.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
