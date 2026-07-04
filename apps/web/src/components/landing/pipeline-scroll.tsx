"use client";

import { useState } from "react";
import { Search, UserCheck, Send, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pipelineSteps = [
  {
    id: "discover",
    title: "Discover",
    stat: "1,400+ signals per session",
    icon: Search,
  },
  {
    id: "enrich",
    title: "Enrich",
    stat: "98% email deliverability",
    icon: UserCheck,
  },
  {
    id: "dispatch",
    title: "Send",
    stat: "3.4× higher response",
    icon: Send,
  },
];

export function PipelineScroll() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="border-t border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Signal to sent in three steps
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 items-start">
          <div className="space-y-3 lg:col-span-4">
            {pipelineSteps.map((step, index) => {
              const isActive = activeStep === index;
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`w-full text-left rounded-xl border p-5 transition-all duration-200 ${
                    isActive
                      ? "border-accent bg-surface"
                      : "border-border bg-background-secondary opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                    <span className="font-semibold">{step.title}</span>
                  </div>
                  {isActive && (
                    <p className="mt-2 text-xs text-muted-foreground font-mono animate-fade-in">{step.stat}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 lg:sticky lg:top-24">
            <div className="rounded-xl border border-border-strong bg-[#080808] overflow-hidden min-h-[320px] flex flex-col">
              <div className="flex items-center justify-between border-b border-border bg-background-secondary px-4 py-3">
                <span className="text-xs font-mono text-muted-foreground">
                  Step {activeStep + 1} of 3
                </span>
                <Badge variant="primary">Active</Badge>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-center">
                {activeStep === 0 && (
                  <div className="animate-fade-in space-y-3">
                    {["Anthropic", "Perplexity", "Granola"].map((name, i) => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface text-sm">
                        <span className="font-medium">{name}</span>
                        <Badge variant="success">{94 - i * 3}% fit</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="animate-fade-in space-y-3">
                    {[
                      { name: "Sarah K.", email: "sarah.k@anthropic.com" },
                      { name: "David L.", email: "david@anthropic.com" },
                    ].map((item) => (
                      <div key={item.email} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface text-sm">
                        <span>{item.name}</span>
                        <span className="font-mono text-accent text-xs">{item.email}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="animate-fade-in rounded-lg border border-border-strong bg-surface p-5 space-y-3 text-sm">
                    <div className="text-muted-foreground font-mono text-xs">Draft ready · tone match 98%</div>
                    <div className="font-medium">Frontend architecture for Claude streaming</div>
                    <p className="text-subtle leading-relaxed">
                      Hi Sarah — I've been following Claude's web UI work. Would love 15 minutes to connect.
                    </p>
                    <Button size="sm" className="h-8">
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border bg-background-secondary px-4 py-3">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
                  className="h-7 px-3 text-xs"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={activeStep === 2}
                  onClick={() => setActiveStep((p) => Math.min(2, p + 1))}
                  className="h-7 px-3 text-xs"
                >
                  Next <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
