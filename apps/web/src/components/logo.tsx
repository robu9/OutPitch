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
  sm: { gap: "gap-2", text: "text-base", icon: "h-5 w-5" },
  md: { gap: "gap-2.5", text: "text-xl", icon: "h-6 w-6" },
  lg: { gap: "gap-3", text: "text-xl", icon: "h-7 w-7" },
};

/** Outbound pitch — rounded tile with an up-right arrow. */
function BrandMark({
  className,
  variant = "brand",
}: {
  className?: string;
  variant?: "brand" | "app";
}) {
  const tile = variant === "app" ? "var(--btn-primary-bg)" : "var(--accent-blue)";
  const arrow = "#ffffff";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill={tile} />
      <path
        d="M10.5 21.5L21.5 10.5M21.5 10.5H14.75M21.5 10.5V17.25"
        stroke={arrow}
        strokeWidth="2.25"
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
        "inline-flex items-center font-sans font-medium tracking-tight text-foreground",
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
