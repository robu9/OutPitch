import { MarketingNav } from "@/components/landing/marketing-nav";
import { Hero } from "@/components/landing/hero";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { PipelineScroll } from "@/components/landing/pipeline-scroll";
import { CogneeSection } from "@/components/landing/cognee-section";
import { BentoGrid } from "@/components/landing/bento-grid";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { TestimonialsMetrics } from "@/components/landing/testimonials-metrics";
import { PricingSection } from "@/components/landing/pricing-section";
import { LandingCta } from "@/components/landing/landing-cta";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#3b82f6] selection:text-white">
      <MarketingNav />
      <main className="relative">
        <Hero />
        <InteractiveDemo />
        <PipelineScroll />
        <CogneeSection />
        <BentoGrid />
        <ComparisonSection />
        <TestimonialsMetrics />
        <PricingSection />
        <LandingCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
