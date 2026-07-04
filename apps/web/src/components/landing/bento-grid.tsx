import { Mail, Search, Database, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const items = [
  {
    icon: Mail,
    iconClass: "text-accent",
    badge: "OAuth",
    title: "Gmail dispatch",
    detail: "Send from your inbox via Composio",
    span: "md:col-span-7",
  },
  {
    icon: Search,
    iconClass: "text-success",
    badge: "Live",
    title: "Serper discovery",
    detail: "Roles detected hours before job boards",
    span: "md:col-span-5",
  },
  {
    icon: Database,
    iconClass: "text-warning",
    badge: "98%",
    title: "Apollo enrichment",
    detail: "Direct emails when pages don't list them",
    span: "md:col-span-5",
  },
  {
    icon: Cpu,
    iconClass: "text-accent",
    badge: "Gemini",
    title: "AI drafts",
    detail: "Technical tone, not template cover letters",
    span: "md:col-span-7",
  },
];

export function BentoGrid() {
  return (
    <section className="border-t border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Built on proven infrastructure
        </h2>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`${item.span} rounded-xl border border-border bg-background-secondary p-6 hover:border-border-strong transition-colors`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`h-5 w-5 ${item.iconClass}`} />
                  <Badge variant="muted">{item.badge}</Badge>
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
