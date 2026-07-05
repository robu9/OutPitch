import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-border bg-bg-base px-3.5 text-sm text-foreground placeholder:text-text-secondary transition-colors focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-foreground/10 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
