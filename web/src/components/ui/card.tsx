import { clsx } from "clsx";

export type CardAccent = "blue" | "teal" | "orange" | "purple" | "navy";

const ACCENT_BORDER: Record<CardAccent, string> = {
  blue: "border-l-blue",
  teal: "border-l-teal",
  orange: "border-l-orange",
  purple: "border-l-purple",
  navy: "border-l-navy",
};

interface CardProps {
  accent?: CardAccent;
  className?: string;
  children: React.ReactNode;
}

/**
 * Contenedor de contenido autocontenido (resumen, grupo de datos). Con
 * `accent`, agrega el borde izquierdo de 4px que marca un encabezado de
 * sección (patrón de docs/ui-design/prompts-stitch.md).
 */
export function Card({ accent, className, children }: CardProps) {
  return (
    <div
      className={clsx(
        "border-border bg-surface rounded-[var(--radius-lg)] border shadow-sm",
        accent && ["border-l-4", ACCENT_BORDER[accent]],
        className,
      )}
    >
      {children}
    </div>
  );
}
