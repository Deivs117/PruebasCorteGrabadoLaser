interface ArrowLeftAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `ArrowLeft` (lucide-react) para BackLink: se desliza 2-3px
 * hacia la izquierda al pasar el mouse, reforzando la dirección "volver".
 */
export function ArrowLeftAnimado({
  className,
  strokeWidth = 1.75,
}: ArrowLeftAnimadoProps) {
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
      <g className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:-translate-x-0.5">
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </g>
    </svg>
  );
}
