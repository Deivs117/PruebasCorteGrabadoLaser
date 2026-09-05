interface HomeAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Home` (lucide-react) con el techo+paredes separado de la
 * puerta, para poder animar solo el primero. Al pasar el mouse, el cuerpo
 * de la casa baja 1-2px y vuelve -- un leve "asentamiento", como si la casa
 * se posara sobre el terreno.
 */
export function HomeAnimado({
  className,
  strokeWidth = 1.75,
}: HomeAnimadoProps) {
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
      {/* Techo + paredes -- baja y vuelve al pasar el mouse. */}
      <g className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:translate-y-0.5">
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </g>
      {/* Puerta -- fija. */}
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    </svg>
  );
}
