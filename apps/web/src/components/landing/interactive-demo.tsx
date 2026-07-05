"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal, SectionHeading } from "@/components/motion/reveal";

const conversation = [
  {
    role: "user" as const,
    text: "I'm targeting staff-level frontend roles at growth-stage startups. What should I focus on this week?",
  },
  {
    role: "assistant" as const,
    text: "Based on your Cognee profile, I'd prioritize 3 companies from last week's pipeline that raised Series B in the last 90 days. Retool and Linear both have open eng leadership — want me to draft outreach?",
  },
  {
    role: "user" as const,
    text: "Yes, draft for the VP of Engineering at Retool. Reference my React + design systems background.",
  },
  {
    role: "assistant" as const,
    text: "Done. I pulled your design systems experience from memory and matched it to their recent component library blog post. Email is ready for your review.",
  },
];

export function InteractiveDemo() {
  const [visible, setVisible] = useState(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(conversation.length);
      return;
    }
    if (visible >= conversation.length) return;
    const timer = setTimeout(() => setVisible((v) => v + 1), 2200);
    return () => clearTimeout(timer);
  }, [visible, reduced]);

  return (
    <section id="demo" data-section-reveal className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="Talk to Outpitch like a strategist"
            description="Ask questions, refine your search, and approve outreach — all in one conversation that remembers context."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div data-float-card className="surface-card overflow-hidden rounded-2xl">
            <div className="border-b border-border px-5 py-3">
              <span className="text-xs text-text-secondary">Live conversation</span>
            </div>

            <div className="min-h-[360px] space-y-4 p-5 md:p-8">
              <AnimatePresence mode="popLayout">
                {conversation.slice(0, visible).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={
                      msg.role === "user" ? "flex justify-end" : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        msg.role === "user"
                          ? "max-w-[85%] rounded-2xl rounded-br-md chat-user-bubble px-4 py-3 text-sm"
                          : "max-w-[85%] rounded-2xl rounded-bl-md chat-assistant-bubble px-4 py-3 text-sm"
                      }
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {visible < conversation.length && !reduced && (
                <motion.div
                  className="flex items-center gap-1.5 pl-2"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary" />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary" />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary" />
                </motion.div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
