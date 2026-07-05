import { Reveal, SectionHeading } from "@/components/motion/reveal";

const testimonials = [
  {
    quote:
      "I stopped mass-applying and started having real conversations. Outpitch found three companies I'd never have discovered on my own.",
    name: "Jordan Kim",
    role: "Senior Frontend Engineer",
  },
  {
    quote:
      "The memory layer is what sold me. It remembered I prefer remote-first startups and stopped suggesting on-site roles.",
    name: "Alex Rivera",
    role: "Staff Software Engineer",
  },
  {
    quote:
      "My reply rate tripled when I switched from templates to Outpitch drafts. The research shows in every email.",
    name: "Samantha Lee",
    role: "Product Designer",
  },
  {
    quote:
      "Finally a tool that treats job search like a strategy, not a numbers game. The pipeline view keeps me focused.",
    name: "Raj Patel",
    role: "Engineering Manager",
  },
  {
    quote:
      "Cognee connecting my past outreach to new recommendations felt like having a recruiter who actually knows me.",
    name: "Emily Chen",
    role: "Full-Stack Developer",
  },
  {
    quote:
      "I landed two interviews in my first month. The decision-maker targeting alone was worth it.",
    name: "Michael Brown",
    role: "Backend Engineer",
  },
];

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="w-[340px] shrink-0 rounded-2xl border border-border bg-bg-base p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-sm text-text-secondary leading-relaxed text-pretty">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface text-xs font-medium text-foreground">
          {name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-text-secondary">{role}</p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const row = [...testimonials, ...testimonials];

  return (
    <section className="border-y border-border bg-bg-elevated py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="Job seekers who switched to precision"
            description="Real outcomes from people who stopped spraying applications and started strategic outreach."
          />
        </Reveal>
      </div>

      <div className="relative mt-14">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 marquee-fade-left" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 marquee-fade-right" />

        <div className="flex animate-marquee gap-4">
          {row.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
