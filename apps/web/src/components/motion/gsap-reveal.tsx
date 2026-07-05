"use client";

import { useRef } from "react";
import { ensureGsap, gsap, useGSAP } from "@/lib/gsap-config";
import { cn } from "@/lib/utils";

export function GsapReveal({
  children,
  className,
  delay = 0,
  y = 36,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();
      const el = ref.current;
      if (!el) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        gsap.set(el, { opacity: 1, y: 0 });
        return;
      }

      const fromVars = {
        y,
        autoAlpha: 0,
        duration: 0.85,
        delay,
        ease: "power3.out" as const,
      };

      if (immediate) {
        gsap.from(el, fromVars);
        return;
      }

      gsap.set(el, { autoAlpha: 0, y });

      gsap.to(el, {
        autoAlpha: 1,
        y: 0,
        duration: fromVars.duration,
        delay: fromVars.delay,
        ease: fromVars.ease,
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true,
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}

export function GsapStagger({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();
      const el = ref.current;
      if (!el) return;

      const items = el.querySelectorAll("[data-stagger-item]");
      if (!items.length) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from(items, {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
