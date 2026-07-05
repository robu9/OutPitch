import { cn } from "@/lib/utils";

const variants = {
  default: "bg-bg-surface text-text-secondary border-border",
  primary: "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] border-transparent",
  outline: "bg-bg-base text-text-secondary border-border",
  highlight: "bg-bg-base text-foreground border-foreground",
};

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
