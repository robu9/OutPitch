"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const nodes = [
  {
    id: "profile",
    title: "Your profile",
    detail: "Skills, goals, tone preferences",
  },
  {
    id: "research",
    title: "Company research",
    detail: "Hiring signals, stack, culture",
  },
  {
    id: "contact",
    title: "Contacts",
    detail: "Verified emails for decision makers",
  },
  {
    id: "history",
    title: "Session history",
    detail: "Rejections, refinements, what worked",
  },
  {
    id: "engine",
    title: "Draft engine",
    detail: "Combines everything into outreach that sounds like you",
  },
];

export function CogneeSection() {
  const [selectedId, setSelectedId] = useState("engine");
  const active = nodes.find((n) => n.id === selectedId) ?? nodes[4];

  const linked = selectedId === "engine"
    ? nodes.slice(0, 4)
    : nodes.filter((n) => n.id === "engine" || n.id === selectedId);

  return (
    <section id="cognee" className="border-t border-border bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Memory that compounds
        </h2>
        <p className="mt-3 max-w-md text-muted-foreground text-pretty">
          Cognee connects profile, research, and history — so every session gets smarter.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="space-y-2">
            {nodes.map((node) => {
              const selected = node.id === selectedId;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selected ? "border-accent bg-surface" : "border-border bg-[#080808] hover:border-border-strong"
                  }`}
                >
                  <div className="font-medium">{node.title}</div>
                  {selected && (
                    <p className="mt-1 text-sm text-muted-foreground animate-fade-in">{node.detail}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border-strong bg-[#080808] p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="primary">Cognee</Badge>
              <span className="text-sm font-medium">{active.title}</span>
            </div>
            <p className="text-subtle mb-6">{active.detail}</p>
            <div className="space-y-2">
              {linked.filter((n) => n.id !== active.id).map((n) => (
                <div key={n.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  {n.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
