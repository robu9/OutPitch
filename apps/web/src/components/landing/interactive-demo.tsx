"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function ToggleGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; title: string; good: boolean }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-xs font-mono text-muted-foreground mb-3">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-all ${
                selected
                  ? opt.good
                    ? "border-accent bg-[#080808] text-white"
                    : "border-warning bg-[#080808] text-white"
                  : "border-border text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              {opt.title}
              {selected &&
                (opt.good ? (
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function InteractiveDemo() {
  const [signalSource, setSignalSource] = useState<"serper" | "jobboards">("serper");
  const [contactMode, setContactMode] = useState<"enriched" | "manual">("enriched");
  const [memoryMode, setMemoryMode] = useState<"cognee" | "none">("cognee");

  const isAllOptimized = signalSource === "serper" && contactMode === "enriched" && memoryMode === "cognee";
  const accuracy = signalSource === "serper" ? (contactMode === "enriched" ? 98 : 82) : 34;
  const replyRate = memoryMode === "cognee" ? (contactMode === "enriched" ? "34%" : "22%") : "8%";

  return (
    <section className="border-t border-border bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Signal search beats job boards
        </h2>

        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <ToggleGroup
              label="Discovery"
              value={signalSource}
              onChange={setSignalSource}
              options={[
                { id: "serper", title: "Live hiring signals", good: true },
                { id: "jobboards", title: "Job boards", good: false },
              ]}
            />
            <ToggleGroup
              label="Contacts"
              value={contactMode}
              onChange={setContactMode}
              options={[
                { id: "enriched", title: "Verified emails", good: true },
                { id: "manual", title: "Manual lookup", good: false },
              ]}
            />
            <ToggleGroup
              label="Memory"
              value={memoryMode}
              onChange={setMemoryMode}
              options={[
                { id: "cognee", title: "Cognee memory", good: true },
                { id: "none", title: "No memory", good: false },
              ]}
            />
          </div>

          <div className="lg:col-span-5 rounded-xl border border-border-strong bg-[#080808] p-6 flex flex-col justify-between">
            <div>
              <div className="grid grid-cols-2 gap-6 pb-6 border-b border-border">
                <div>
                  <div className="text-3xl font-bold font-mono tabular-nums">{accuracy}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono tabular-nums">{replyRate}</div>
                  <div className="text-xs text-muted-foreground mt-1">Reply rate</div>
                </div>
              </div>

              <div className="mt-6">
                {isAllOptimized ? (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-success font-bold">High signal</span>
                      <Badge variant="success">98% fit</Badge>
                    </div>
                    <p className="text-sm text-subtle">
                      Vercel · Senior Frontend · posted 4h ago · CEO email found · draft ready
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-warning font-bold">Low signal</span>
                      <Badge variant="warning">Noise</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Stale listing · generic inbox · template draft
                    </p>
                  </div>
                )}
              </div>
            </div>

            {!isAllOptimized && (
              <button
                type="button"
                onClick={() => {
                  setSignalSource("serper");
                  setContactMode("enriched");
                  setMemoryMode("cognee");
                }}
                className="mt-8 w-full rounded-md bg-white px-4 py-3 text-xs font-mono font-bold text-black hover:bg-primary-hover flex items-center justify-center gap-2"
              >
                Optimize all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
