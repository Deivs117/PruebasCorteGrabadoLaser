interface BarChart3AnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `BarChart3` (lucide-react): las 3 barras "crecen" de nuevo
 * desde la base al pasar el mouse, escalonadas -- cada una usa
 * @keyframes barchart-crecer con un animation-delay distinto.
 */
export function BarChart3Animado({
  className,
  strokeWidth = 1.75,
}: BarChart3AnimadoProps) {
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
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <g
        style={{ transformOrigin: "8px 17px" }}
        className="group-hover:animate-[barchart-crecer_500ms_ease-out]"
      >
        <path d="M8 17v-3" />
      </g>
      <g
        style={{ transformOrigin: "13px 17px", animationDelay: "80ms" }}
        className="group-hover:animate-[barchart-crecer_500ms_ease-out]"
      >
        <path d="M13 17V5" />
      </g>
      <g
        style={{ transformOrigin: "18px 17px", animationDelay: "160ms" }}
        className="group-hover:animate-[barchart-crecer_500ms_ease-out]"
      >
        <path d="M18 17V9" />
      </g>
    </svg>
  );
}
