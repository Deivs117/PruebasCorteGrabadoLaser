interface ScissorsAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Ícono de "Corte": en reposo las hojas están cerradas (las puntas se tocan
 * arriba); al pasar el mouse, quedan abriendo y cerrando en loop -- un
 * "tijeretazo" repetido, no una sola apertura -- pivotando cada hoja desde
 * su propia base (junto al mango), como el mecanismo real.
 */
export function ScissorsAnimado({
  className,
  strokeWidth = 1.75,
}: ScissorsAnimadoProps) {
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
      {/* Mangos -- fijos. */}
      <circle cx="7" cy="19" r="2.3" />
      <circle cx="17" cy="19" r="2.3" />
      {/* Hoja izquierda -- pivota desde su base, junto al mango izquierdo. */}
      <g
        style={{ transformOrigin: "8.8px 16.8px" }}
        className="group-hover:animate-[tijera-corte_420ms_ease-in-out_infinite]"
      >
        <path d="M8.8 16.8 12 5" />
      </g>
      {/* Hoja derecha -- espejo de la anterior. */}
      <g
        style={{ transformOrigin: "15.2px 16.8px" }}
        className="group-hover:animate-[tijera-corte-espejo_420ms_ease-in-out_infinite]"
      >
        <path d="M15.2 16.8 12 5" />
      </g>
    </svg>
  );
}
