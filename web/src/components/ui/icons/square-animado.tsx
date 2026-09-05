interface SquareAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Square` (lucide-react) para el paso "Geometría genérica"
 * del wizard: gira 90° suave al pasar el mouse.
 */
export function SquareAnimado({
  className,
  strokeWidth = 1.75,
}: SquareAnimadoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g
        style={{ transformOrigin: "12px 12px" }}
        className="transition-transform duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:rotate-90"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
      </g>
    </svg>
  );
}
