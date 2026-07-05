"use client";

import { useRef } from "react";
import { ensureGsap, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap-config";
import { AmbientGlow } from "@/components/landing/ambient-glow";

export function LandingShell({ children }: { children: React.ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-float-card]");
      cards.forEach((card, i) => {
        gsap.to(card, {
          y: i % 2 === 0 ? -8 : 8,
          duration: 4.5 + i * 0.4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      ScrollTrigger.batch("[data-section-reveal]", {
        start: "top 88%",
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0,
            y: 32,
            duration: 0.8,
            stagger: 0.05,
            ease: "power3.out",
            overwrite: true,
          });
        },
        once: true,
      });

      ScrollTrigger.batch("[data-stagger-item]", {
        start: "top 85%",
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0,
            y: 24,
            duration: 0.65,
            stagger: 0.07,
            ease: "power3.out",
            overwrite: true,
          });
        },
        once: true,
      });
    },
    { scope: shellRef }
  );

  return (
    <div
      ref={shellRef}
      className="relative min-h-screen bg-bg-base text-foreground"
    >
      <AmbientGlow />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

