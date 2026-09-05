interface PencilAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Ícono de "Editar" (lápiz) que menea muy sutilmente, como si estuviera
 * escribiendo, al pasar el mouse -- loop corto y de amplitud chica a
 * propósito (ver @keyframes pencil-escribe): es una acción secundaria, no
 * debe llamar la atención más que el contenido de la tarjeta.
 */
export function PencilAnimado({
  className,
  strokeWidth = 1.75,
}: PencilAnimadoProps) {
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
        style={{ transformOrigin: "4px 20px" }}
        className="group-hover:animate-[pencil-escribe_500ms_ease-in-out_infinite]"
      >
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="m15 5 4 4" />
      </g>
    </svg>
  );
}
