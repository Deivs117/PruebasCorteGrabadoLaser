import { clsx } from "clsx";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "inverted" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium " +
  "transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white hover:bg-blue-hover",
  secondary: "bg-blue-soft text-navy hover:bg-border",
  outline: "border border-border bg-transparent text-navy hover:bg-navy-soft",
  inverted: "bg-white/10 text-white hover:bg-white/20",
  danger: "bg-danger text-white hover:bg-danger-hover",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return clsx(BASE, VARIANTS[variant], SIZES[size], className);
}
