interface FlipVerticalAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Ícono de "Espejar verticalmente" (barra de acciones rápida del lienzo,
 * #107) -- mismo concepto que `FlipHorizontalAnimado` pero rotado 90°: dos
 * triángulos enfrentados a una línea de simetría horizontal punteada, que
 * se separan un poco al pasar el mouse.
 */
export function FlipVerticalAnimado({
  className,
  strokeWidth = 1.75,
}: FlipVerticalAnimadoProps) {
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
      <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2" />
      <path
        d="M6 8 9 4h6l3 4z"
        className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:-translate-y-1"
      />
      <path
        d="M6 16l3 4h6l3-4z"
        className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:translate-y-1"
      />
    </svg>
  );
}
