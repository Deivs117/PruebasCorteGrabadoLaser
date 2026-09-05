interface CircleDollarSignAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `CircleDollarSign` (lucide-react): el símbolo completo hace
 * un rebote vertical corto al pasar el mouse, como si acabara de caer una
 * moneda (ver @keyframes dollarsign-rebote, se dispara una vez por hover).
 */
export function CircleDollarSignAnimado({
  className,
  strokeWidth = 1.75,
}: CircleDollarSignAnimadoProps) {
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
      <circle cx="12" cy="12" r="10" />
      <g className="group-hover:animate-[dollarsign-rebote_450ms_ease-out]">
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </g>
    </svg>
  );
}
