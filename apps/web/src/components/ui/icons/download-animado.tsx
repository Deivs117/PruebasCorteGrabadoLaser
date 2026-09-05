interface DownloadAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Download` (lucide-react) con la flecha separada de la
 * bandeja, para poder animarla -- al pasar el mouse, la flecha "cae" hacia
 * la bandeja (translateY).
 */
export function DownloadAnimado({
  className,
  strokeWidth = 1.75,
}: DownloadAnimadoProps) {
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
      {/* Flecha -- cae hacia la bandeja al pasar el mouse. */}
      <g className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:translate-y-1">
        <path d="M12 15V3" />
        <path d="m7 10 5 5 5-5" />
      </g>
      {/* Bandeja -- fija. */}
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}
