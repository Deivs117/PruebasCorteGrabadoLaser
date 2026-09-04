interface TrashCanAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Trash2` (lucide-react) con la tapa separada del cuerpo, para
 * poder animarla al pasar el mouse -- un ícono de una sola pieza no permite
 * mover solo una parte. Pensado para usarse dentro de un botón con la clase
 * "group" (ver iconButtonClasses): la tapa reacciona al hover del BOTÓN
 * completo, no solo del ícono, para que no haya un punto muerto sin feedback.
 *
 * Mismo trazo (stroke, sin relleno, extremos redondeados) que el resto de
 * los íconos lucide de la app, para que en reposo sea indistinguible.
 */
export function TrashCanAnimado({
  className,
  strokeWidth = 1.75,
}: TrashCanAnimadoProps) {
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
      {/* Cuerpo del basurero -- fijo. */}
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
      {/* Tapa + agarre -- gira sobre su esquina izquierda al pasar el mouse,
          como si se levantara para tirar algo adentro. */}
      <g
        style={{ transformOrigin: "4px 6px" }}
        className="transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:-translate-y-0.5 group-hover:rotate-[-18deg]"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </g>
    </svg>
  );
}
