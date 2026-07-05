import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "h-6 w-6", text: "text-sm" },
  md: { icon: "h-7 w-7", text: "text-base" },
  lg: { icon: "h-8 w-8", text: "text-lg" },
};

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#ffffff" />
      <path
        d="M9 22V10h3.2l4.8 7.2V10H20v12h-3.2L12 14.8V22H9z"
        fill="#050505"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  href = "/",
  showWordmark = true,
  className,
}: LogoProps) {
  const s = sizes[size];
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={s.icon} />
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight text-white", s.text)}>
          Outpitch
        </span>
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
