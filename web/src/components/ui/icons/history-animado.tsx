interface HistoryAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `History` (lucide-react): la manecilla del reloj da una
 * vuelta completa al pasar el mouse -- una sola transición (no un loop),
 * el resto del ícono (flecha de "volver atrás" + marco) queda fijo.
 */
export function HistoryAnimado({
  className,
  strokeWidth = 1.75,
}: HistoryAnimadoProps) {
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      {/* Manecilla -- da una vuelta completa al pasar el mouse. */}
      <g
        style={{ transformOrigin: "12px 12px" }}
        className="transition-transform duration-500 ease-[var(--ease-motion)] group-hover:rotate-[360deg]"
      >
        <path d="M12 7v5l4 2" />
      </g>
    </svg>
  );
}
