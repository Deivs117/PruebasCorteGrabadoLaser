interface XAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `X` (lucide-react) para cerrar foto / quitar chip / quitar
 * fila: gira 90° al pasar el mouse, como "confirmando" el cierre antes del
 * click.
 */
export function XAnimado({ className, strokeWidth = 1.75 }: XAnimadoProps) {
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
        style={{ transformOrigin: "12px 12px" }}
        className="transition-transform duration-[var(--duration-standard)] ease-[var(--ease-motion)] group-hover:rotate-90"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </g>
    </svg>
  );
}
