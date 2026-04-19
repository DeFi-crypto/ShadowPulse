import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "neon";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  default:
    "bg-charcoal-600 text-slate-100 hover:bg-charcoal-500 border border-white/5",
  ghost: "bg-transparent text-slate-300 hover:bg-white/5",
  outline:
    "bg-transparent border border-white/10 text-slate-200 hover:border-white/30",
  neon: "bg-neon-red/10 border border-neon-red/40 text-neon-red hover:bg-neon-red/20",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "default", size = "md", className, children, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
