import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#1f1f1f] bg-[#080808] py-20 px-4 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#111111] shadow-inner">
        <Icon className="h-5 w-5 text-[#888888]" aria-hidden />
      </div>
      <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#888888] text-pretty">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
