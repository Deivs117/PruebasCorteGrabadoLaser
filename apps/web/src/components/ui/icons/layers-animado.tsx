interface LayersAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Layers` (lucide-react): las 3 capas se separan levemente
 * en el eje Y al pasar el mouse -- efecto "vista explotada".
 */
export function LayersAnimado({
  className,
  strokeWidth = 1.75,
}: LayersAnimadoProps) {
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
      <g className="transition-transform duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:-translate-y-1">
        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      </g>
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <g className="transition-transform duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:translate-y-1">
        <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
      </g>
    </svg>
  );
}
