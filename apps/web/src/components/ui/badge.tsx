import { cn } from "@/lib/utils";

const variants = {
  default: "bg-bg-surface text-text-secondary border-border",
  primary: "bg-white text-[#050505] border-transparent",
  outline: "bg-transparent text-text-secondary border-border",
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
