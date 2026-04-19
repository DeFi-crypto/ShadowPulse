import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/5 bg-charcoal-700/60 backdrop-blur-sm shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-4 pt-4 pb-2 flex items-start justify-between gap-2",
      className,
    )}
    {...rest}
  />
);

export const CardTitle = ({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "text-sm font-semibold uppercase tracking-wider text-slate-200",
      className,
    )}
    {...rest}
  />
);

export const CardContent = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-4 pb-4", className)} {...rest} />
);
