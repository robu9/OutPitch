"use client";

import { useRef } from "react";
import { ensureGsap, gsap, useGSAP } from "@/lib/gsap-config";

export function AmbientGlow() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const orb = rootRef.current?.querySelector<HTMLElement>(".ambient-orb");
      if (!orb) return;

      gsap.to(orb, {
        y: 12,
        duration: 10,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
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
      {/* Match reference: single top radial, no side orbs */}
      <div className="hero-radial ambient-orb absolute inset-x-0 top-0 h-[600px] w-full md:h-[800px]" />
    </div>
  );
}
