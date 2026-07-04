import { Check, X } from "lucide-react";

const rows = [
  { feature: "Discovery", old: "Stale job boards", new: "Live hiring signals" },
  { feature: "Contacts", old: "Generic inboxes", new: "Verified decision makers" },
  { feature: "Drafts", old: "ChatGPT templates", new: "Your voice, your context" },
  { feature: "Memory", old: "Resets every session", new: "Cognee compounds" },
  { feature: "Reply rate", old: "1–3%", new: "18–34%" },
];

export function ComparisonSection() {
  return (
    <section className="border-t border-border bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl text-balance">
          Manual search vs Outpitch
        </h2>

        <div className="mt-10 rounded-xl border border-border-strong bg-[#080808] overflow-hidden">
          <div className="grid grid-cols-3 border-b border-border bg-background-secondary text-xs font-mono font-bold">
            <div className="p-4 text-muted-foreground" />
            <div className="p-4 text-destructive border-l border-border flex items-center gap-2">
              <X className="h-3.5 w-3.5" /> Manual
            </div>
            <div className="p-4 text-accent border-l border-border flex items-center gap-2">
              <Check className="h-3.5 w-3.5" /> Outpitch
            </div>
          </div>

          {rows.map((row) => (
            <div key={row.feature} className="grid grid-cols-3 border-b border-border last:border-0 text-sm">
              <div className="p-4 font-medium">{row.feature}</div>
              <div className="p-4 text-muted-foreground border-l border-border">{row.old}</div>
              <div className="p-4 text-white border-l border-border bg-surface/50">{row.new}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
