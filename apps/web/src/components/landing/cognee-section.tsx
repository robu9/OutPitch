"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, SectionHeading } from "@/components/motion/reveal";

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
};

const nodes: Node[] = [
  { id: "profile", label: "Your Profile", x: 50, y: 50 },
  { id: "prefs", label: "Preferences", x: 22, y: 28 },
  { id: "companies", label: "Companies", x: 78, y: 25 },
  { id: "recruiters", label: "Recruiters", x: 85, y: 55 },
  { id: "emails", label: "Emails", x: 70, y: 78 },
  { id: "research", label: "Research", x: 30, y: 75 },
  { id: "conversations", label: "Conversations", x: 15, y: 52 },
  { id: "memory", label: "Cognee Memory", x: 50, y: 18 },
];

const edges: [string, string][] = [
  ["profile", "prefs"],
  ["profile", "conversations"],
  ["profile", "memory"],
  ["memory", "companies"],
  ["memory", "research"],
  ["companies", "recruiters"],
  ["recruiters", "emails"],
  ["research", "emails"],
  ["conversations", "prefs"],
  ["prefs", "companies"],
];

function getNode(id: string) {
  return nodes.find((n) => n.id === id)!;
}

export function CogneeSection() {
  const [activeEdge, setActiveEdge] = useState(0);
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setActiveEdge((e) => (e + 1) % edges.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [reduced]);

  return (
    <section className="border-y border-border bg-bg-elevated py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              align="left"
              title="The Cognee memory engine"
              description="Every interaction feeds a knowledge graph. Outpitch gets smarter about what you want, who you've reached, and what works — session after session."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Profile and preferences persist across conversations",
                "Company research links to outreach history",
                "Replies and feedback refine future recommendations",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-text-secondary"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              ref={containerRef}
              className="relative aspect-square w-full max-w-md mx-auto lg:max-w-none rounded-2xl border border-border bg-bg-base overflow-hidden"
            >
              <div className="dot-pattern absolute inset-0 opacity-30" aria-hidden />

              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                {edges.map(([from, to], i) => {
                  const a = getNode(from);
                  const b = getNode(to);
                  const isActive = i === activeEdge;
                  return (
                    <motion.line
                      key={`${from}-${to}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isActive ? "var(--graph-stroke-active)" : "var(--graph-stroke)"}
                      strokeWidth={isActive ? 0.4 : 0.2}
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0.4,
                      }}
                      transition={{ duration: 0.6 }}
                    />
                  );
                })}
              </svg>

              {nodes.map((node, i) => (
                <motion.div
                  key={node.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.06,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap ${
                      node.id === "memory"
                        ? "border-[var(--graph-node-active-bg)] bg-[var(--graph-node-active-bg)] text-[var(--graph-node-active-fg)]"
                        : "border-border bg-bg-base text-text-secondary shadow-sm"
                    }`}
                  >
                    {node.label}
                  </div>
                </motion.div>
              ))}

              {!reduced && (
                <motion.div
                  className="absolute h-2 w-2 rounded-full bg-[var(--graph-stroke-active)]"
                  animate={{
                    left: [
                      `${getNode(edges[activeEdge][0]).x}%`,
                      `${getNode(edges[activeEdge][1]).x}%`,
                    ],
                    top: [
                      `${getNode(edges[activeEdge][0]).y}%`,
                      `${getNode(edges[activeEdge][1]).y}%`,
                    ],
                  }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transform: "translate(-50%, -50%)" }}
                />
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
