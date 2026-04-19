import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function severityColor(score: number): string {
  if (score >= 70) return "#FF3B30";
  if (score >= 40) return "#FFCC00";
  return "#34C759";
}

export function severityLabel(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function severityClass(score: number): string {
  if (score >= 70) return "text-neon-red";
  if (score >= 40) return "text-neon-yellow";
  return "text-neon-green";
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}
