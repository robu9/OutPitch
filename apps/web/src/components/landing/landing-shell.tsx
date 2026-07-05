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
          y: i % 2 === 0 ? -4 : 4,
          duration: 5 + i * 0.4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      const staggerItems = gsap.utils.toArray<HTMLElement>("[data-stagger-item]");
      if (staggerItems.length) {
        gsap.set(staggerItems, { autoAlpha: 0, y: 20 });

        ScrollTrigger.batch(staggerItems, {
          start: "top 90%",
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              stagger: 0.06,
              ease: "power3.out",
              overwrite: true,
            });
          },
          once: true,
        });
      }
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
