import { clsx } from "clsx";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "inverted" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  // "group" es el gancho que usan los íconos animados dentro de <Button>/
  // <LinkButton> (ver components/ui/icons/) para reaccionar al hover del
  // botón completo -- no aplica ningún estilo por sí solo.
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-sm)] font-medium " +
  "transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-quick)] ease-[var(--ease-motion)] " +
  // Feedback físico: se eleva un poco al pasar el mouse, se "achica" al
  // hacer click (sin rebote — personalidad "Corporate", ver globals.css).
  "hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.97] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

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

/** Botón de ícono chico (editar/duplicar/eliminar en una fila o tarjeta) —
 * antes cada uno repetía esta misma cadena de clases a mano en 6 archivos
 * distintos, ya divergiendo en detalles. */
export function iconButtonClasses(
  tono: "neutral" | "danger" = "neutral",
  className?: string,
): string {
  return clsx(
    // "group" no aplica ningún estilo por sí solo -- es el gancho que usan
    // los íconos animados (ver components/ui/icons/) para reaccionar al
    // hover del botón completo, no solo del ícono.
    "group relative flex size-7 items-center justify-center overflow-hidden rounded-[var(--radius-sm)]",
    "transition-[color,background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
    "active:scale-90",
    tono === "danger"
      ? "text-text-muted hover:bg-danger-soft hover:text-danger"
      : "text-text-muted hover:bg-navy-soft hover:text-navy",
    className,
  );
}
