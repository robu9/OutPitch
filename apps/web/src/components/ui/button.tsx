import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "accent";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)] border border-transparent",
  accent:
    "bg-[var(--btn-accent-bg)] text-[var(--btn-accent-fg)] hover:bg-[var(--btn-accent-hover)] border border-[var(--btn-accent-border)] shadow-[var(--btn-accent-shadow)] active:scale-95",
  secondary:
    "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)] hover:bg-[var(--btn-secondary-hover)] border border-border",
  ghost:
    "bg-transparent text-text-secondary hover:text-foreground hover:bg-[var(--btn-ghost-hover)]",
  outline:
    "bg-[var(--btn-outline-bg)] text-foreground border border-border hover:bg-[var(--btn-ghost-hover)] hover:border-border-strong",
};

const sizes = {
  sm: "h-8 px-4 text-sm rounded-full",
  md: "h-10 px-5 text-sm rounded-full",
  lg: "h-12 px-7 text-sm rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-normal tracking-wide transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
