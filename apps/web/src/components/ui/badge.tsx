type Variant = "default" | "primary" | "success" | "warning" | "muted";

const styles: Record<Variant, string> = {
  default: "bg-[#111111] border border-[#1f1f1f] text-[#888888]",
  primary: "bg-[#111111] border border-[#3b82f6]/40 text-[#3b82f6] font-mono",
  success: "bg-[#111111] border border-[#10b981]/40 text-[#10b981] font-mono",
  warning: "bg-[#111111] border border-[#f59e0b]/40 text-[#f59e0b] font-mono",
  muted: "bg-[#0b0b0b] border border-[#1f1f1f] text-[#888888] font-mono",
};

export function Badge({
  children,
  variant = "default",
  pulse = false,
  className = "",
}: {
  children: React.ReactNode;
  variant?: Variant;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium tabular-nums tracking-tight ${styles[variant]} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === "primary"
                ? "bg-[#3b82f6]"
                : variant === "success"
                  ? "bg-[#10b981]"
                  : variant === "warning"
                    ? "bg-[#f59e0b]"
                    : "bg-[#888888]"
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              variant === "primary"
                ? "bg-[#3b82f6]"
                : variant === "success"
                  ? "bg-[#10b981]"
                  : variant === "warning"
                    ? "bg-[#f59e0b]"
                    : "bg-[#888888]"
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
}
