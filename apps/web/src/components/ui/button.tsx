import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "terminal";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-white text-black hover:bg-[#e0e0e0] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.8)] active:scale-[0.98]",
  secondary:
    "bg-[#111111] text-white border border-[#1f1f1f] hover:bg-[#161616] hover:border-[#2a2a2a] active:scale-[0.98]",
  ghost: "text-[#888888] hover:text-white hover:bg-[#111111]",
  destructive: "bg-[#ef4444] text-white hover:bg-[#dc2626] active:scale-[0.98]",
  terminal:
    "bg-[#080808] text-[#d4d4d4] border border-[#2a2a2a] hover:border-accent hover:text-white font-mono text-xs tracking-tight active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-sm gap-2 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";
