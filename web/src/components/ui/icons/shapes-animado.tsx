interface ShapesAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Shapes` (lucide-react) con las 3 formas en sus propios
 * <g>. Al pasar el mouse rotan levemente, cada una con un delay distinto
 * (stagger chico) -- como si estuvieran "tomando forma".
 */
export function ShapesAnimado({
  className,
  strokeWidth = 1.75,
}: ShapesAnimadoProps) {
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
        style={{ transformOrigin: "11.9px 6px" }}
        className="transition-transform duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:rotate-[8deg]"
      >
        <path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z" />
      </g>
      <g
        style={{ transformOrigin: "6.5px 17.5px" }}
        className="transition-transform delay-75 duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:rotate-[-10deg]"
      >
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </g>
      {/* El círculo es simétrico -- rotarlo no se nota, así que en vez de
          girar "toma forma" agrandándose un poco. */}
      <g
        style={{ transformOrigin: "17.5px 17.5px" }}
        className="transition-transform delay-150 duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:scale-110"
      >
        <circle cx="17.5" cy="17.5" r="3.5" />
      </g>
    </svg>
  );
}
