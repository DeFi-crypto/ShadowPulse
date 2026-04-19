import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "red" | "yellow" | "green" | "slate" | "blue";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  red: "bg-neon-red/10 text-neon-red border-neon-red/30",
  yellow: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30",
  green: "bg-neon-green/10 text-neon-green border-neon-green/30",
  blue: "bg-neon-blue/10 text-neon-blue border-neon-blue/30",
  slate: "bg-white/5 text-slate-300 border-white/10",
};

export function Badge({ tone = "slate", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
