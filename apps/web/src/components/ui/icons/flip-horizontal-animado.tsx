interface FlipHorizontalAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Ícono de "Espejar horizontalmente" (barra de acciones rápida del lienzo,
 * #107): dos triángulos enfrentados a una línea de simetría vertical
 * punteada -- al pasar el mouse se separan un poco de esa línea, como
 * anticipando el espejado.
 */
export function FlipHorizontalAnimado({
  className,
  strokeWidth = 1.75,
}: FlipHorizontalAnimadoProps) {
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
      <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" />
      <path
        d="M8 6 4 9v6l4 3z"
        className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:-translate-x-1"
      />
      <path
        d="M16 6l4 3v6l-4 3z"
        className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:translate-x-1"
      />
    </svg>
  );
}
