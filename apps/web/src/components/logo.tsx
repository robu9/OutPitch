"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  /** Icon-only mark for narrow spaces (e.g. collapsed sidebar). */
  compact?: boolean;
  variant?: "brand" | "app";
  className?: string;
}

const sizes = {
  sm: { gap: "gap-2.5", text: "text-xl", icon: "h-7 w-7" },
  md: { gap: "gap-3", text: "text-[1.65rem]", icon: "h-8 w-8" },
  lg: { gap: "gap-3", text: "text-3xl", icon: "h-9 w-9" },
};

/** Outbound pitch — hex tile with a centered up-right arrow. */
function BrandMark({
  className,
  variant = "brand",
}: {
  className?: string;
  variant?: "brand" | "app";
}) {
  const fill = variant === "app" ? "var(--btn-primary-bg)" : "var(--accent-blue)";
  const arrow = "#ffffff";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M16 2.5L27.5 9.25V22.75L16 29.5L4.5 22.75V9.25L16 2.5Z"
        fill={fill}
      />
      <path
        d="M12.25 19.75L19.75 12.25M19.75 12.25H15.1M19.75 12.25V16.9"
        stroke={arrow}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  href = "/",
  compact = false,
  variant = "brand",
  className,
}: LogoProps) {
  const s = sizes[size];

  const content = compact ? (
    <BrandMark className={s.icon} variant={variant} />
  ) : (
    <span
      className={cn(
        "inline-flex items-center font-sans font-bold tracking-tight text-foreground",
        s.gap,
        s.text,
        className
      )}
    >
      <BrandMark className={s.icon} variant={variant} />
      Outpitch
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
