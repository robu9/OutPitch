"use client";

import { useRef } from "react";
import { ensureGsap, gsap, useGSAP } from "@/lib/gsap-config";

export function AmbientGlow() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();
      const orbs = gsap.utils.toArray<HTMLElement>(".ambient-orb");
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          y: i % 2 === 0 ? 28 : -22,
          x: i % 2 === 0 ? -18 : 14,
          duration: 7 + i * 1.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(orb, {
          scale: 1.08,
          opacity: "+=0.08",
          duration: 5 + i,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="hero-radial absolute inset-x-0 top-0 h-[min(90vh,900px)]" />
      <div className="ambient-orb absolute -left-[10%] top-[8%] h-[420px] w-[420px] rounded-full bg-[var(--orb-1)] blur-[100px]" />
      <div className="ambient-orb absolute -right-[5%] top-[18%] h-[360px] w-[360px] rounded-full bg-[var(--orb-2)] blur-[90px]" />
      <div className="ambient-orb absolute left-[30%] top-[55%] h-[280px] w-[280px] rounded-full bg-[var(--orb-3)] blur-[80px]" />
    </div>
  );
}
