import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  /** Two-line wordmark for narrow spaces (e.g. collapsed sidebar). */
  compact?: boolean;
  className?: string;
}

const sizes = {
  sm: "text-[15px]",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo({
  size = "md",
  href = "/",
  compact = false,
  className,
}: LogoProps) {
  const content = (
    <span
      className={cn(
        "font-wordmark font-extrabold tracking-[-0.04em] text-foreground",
        compact ? "text-center text-[10px] leading-[1.05]" : sizes[size],
        className
      )}
    >
      {compact ? (
        <>
          Out
          <br />
          pitch
        </>
      ) : (
        "Outpitch"
      )}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
