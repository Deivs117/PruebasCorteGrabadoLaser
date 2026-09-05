interface FilterAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Filter` (lucide-react) para la leyenda de chips de
 * material: vibración/goteo muy sutil en loop mientras dura el hover sobre
 * la leyenda completa (ver @keyframes filter-goteo).
 */
export function FilterAnimado({
  className,
  strokeWidth = 1.75,
}: FilterAnimadoProps) {
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
      <g className="group-hover:animate-[filter-goteo_700ms_ease-in-out_infinite]">
        <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
      </g>
    </svg>
  );
}
