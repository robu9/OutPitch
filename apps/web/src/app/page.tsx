import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Zap, Target, Mail, Brain, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Outpitch</span>
          </div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors">
                Continue with LinkedIn
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/chat"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Land your dream job with{" "}
            <span className="text-primary">AI-powered outreach</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Outpitch finds companies hiring for your role, discovers founder and
            recruiter emails, and helps you send personalized outreach — all
            powered by persistent AI memory.
          </p>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-accent transition-colors">
                Continue with LinkedIn
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-accent transition-colors"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </SignedIn>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          {[
            {
              icon: Target,
              title: "Smart Company Discovery",
              desc: "AI searches for companies hiring your role and scores them against your profile.",
            },
            {
              icon: Mail,
              title: "Contact Finding",
              desc: "Crawls company websites and uses Apollo to find founder and recruiter emails.",
            },
            {
              icon: Brain,
              title: "Smart Context",
              desc: "Uses your profile, chat history, and company data to personalize recommendations.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <Icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
