"use client";

import { useRef } from "react";
import { ensureGsap, gsap, useGSAP } from "@/lib/gsap-config";

/** Softer ambient layer for authenticated app surfaces */
export function AppAmbient() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const orbs = gsap.utils.toArray<HTMLElement>(".app-ambient-orb");
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          y: i % 2 === 0 ? 16 : -12,
          duration: 8 + i * 2,
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
      <div className="hero-radial absolute inset-x-0 top-0 h-[50vh] opacity-50" />
      <div className="app-ambient-orb absolute -right-[8%] top-[12%] h-[320px] w-[320px] rounded-full bg-[var(--orb-2)] blur-[100px] opacity-60" />
      <div className="app-ambient-orb absolute -left-[6%] bottom-[20%] h-[240px] w-[240px] rounded-full bg-[var(--orb-1)] blur-[80px] opacity-50" />
    </div>
  );
}
