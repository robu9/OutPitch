import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md";
  href?: string | null;
  showWordmark?: boolean;
}

export function Logo({ size = "md", href = "/", showWordmark = true }: LogoProps) {
  const iconSize = size === "sm" ? 24 : 28;
  const textSize = size === "sm" ? "text-sm" : "text-base";

  const mark = (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" className="fill-primary" />
        <circle
          cx="14"
          cy="14"
          r="5.5"
          strokeWidth="2.5"
          className="stroke-primary-foreground"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span className={`${textSize} font-semibold tracking-tight text-foreground`}>
          Outpitch
        </span>
      )}
    </span>
  );

  if (href === null) return mark;

  return (
    <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-80">
      {mark}
    </Link>
  );
}
