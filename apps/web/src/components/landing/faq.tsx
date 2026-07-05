"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What is Outpitch?",
    a: "Outpitch is an AI-powered job outreach platform. It discovers companies hiring for your role, finds decision-maker contacts, drafts personalized emails, and tracks your pipeline — with persistent memory via Cognee.",
  },
  {
    q: "How is this different from applying on job boards?",
    a: "Job boards are reactive — you wait for postings. Outpitch is proactive: you reach hiring leaders at companies that match your profile, with research-backed outreach that stands out.",
  },
  {
    q: "What is Cognee and why does it matter?",
    a: "Cognee is a knowledge graph that stores your profile, preferences, company research, and conversation history. Unlike chatbots that reset every session, Outpitch remembers context and improves recommendations over time.",
  },
  {
    q: "Do I approve emails before they're sent?",
    a: "Yes. Outpitch drafts outreach for your review. Nothing sends without your explicit approval.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes 10 company discoveries and 5 drafts per month — enough to see if Outpitch fits your search style.",
  },
  {
    q: "How does Outpitch find contacts?",
    a: "We combine real-time hiring signals with verified contact data from trusted providers. Contacts are ranked by relevance to your target role.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-5 md:px-8">
        <Reveal>
          <SectionHeading
            title="Frequently asked questions"
            description="Everything you need to know about Outpitch and how it works."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <Accordion.Root type="single" collapsible className="space-y-2">
            {faqs.map((faq) => (
              <Accordion.Item
                key={faq.q}
                value={faq.q}
                className="overflow-hidden rounded-xl border border-border bg-bg-elevated"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white transition-colors hover:bg-bg-hover">
                    {faq.q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
                      aria-hidden
                    />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content
                  className={cn(
                    "overflow-hidden text-sm text-text-secondary",
                    "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                  )}
                >
                  <div className="px-5 pb-4 leading-relaxed text-pretty">{faq.a}</div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Reveal>
      </div>
    </section>
  );
}
