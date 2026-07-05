import { Reveal } from "@/components/motion/reveal";

const logos = ["Linear", "Vercel", "Stripe", "Notion", "Arc", "Raycast"];

export function LogoBar() {
  return (
    <section className="border-y border-border bg-bg-elevated py-12">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <p className="mb-8 text-center text-sm text-text-secondary">
            Built for job seekers who expect more than spray-and-pray
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 md:grid-cols-6">
          {logos.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center bg-bg-base py-6 text-sm font-medium text-text-secondary transition-colors hover:text-white"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
