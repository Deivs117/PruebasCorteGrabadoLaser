interface CopyAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Ícono de "Duplicar" con el cuadro de atrás separado del de adelante (`Copy`
 * de lucide) para poder animarlo -- al pasar el mouse, el cuadro de atrás se
 * desliza un poco más lejos, como si el de adelante acabara de "salir" de él.
 */
export function CopyAnimado({
  className,
  strokeWidth = 1.75,
}: CopyAnimadoProps) {
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
      {/* Cuadro de atrás -- se aleja al hacer hover. */}
      <g className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:-translate-x-1 group-hover:-translate-y-1">
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </g>
      {/* Cuadro de adelante -- fijo. */}
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    </svg>
  );
}
