import { MarketingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { LogoBar } from "@/components/landing/logo-bar";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { HowItWorks } from "@/components/landing/how-it-works";
import { WhyFails } from "@/components/landing/why-fails";
import { HowSolves } from "@/components/landing/how-solves";
import { CogneeSection } from "@/components/landing/cognee-section";
import { Features } from "@/components/landing/features";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { LandingCta } from "@/components/landing/cta";
import { MarketingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-base text-foreground">
      <MarketingNav />
      <main>
        <Hero />
        <LogoBar />
        <InteractiveDemo />
        <HowItWorks />
        <WhyFails />
        <HowSolves />
        <CogneeSection />
        <Features />
        <Testimonials />
        <Pricing />
        <FAQ />
        <LandingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
