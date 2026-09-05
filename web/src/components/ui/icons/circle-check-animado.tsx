interface CircleCheckAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `CircleCheck` (lucide-react) para confirmaciones de éxito
 * (suite generada, ejecución generada, registro guardado): aparece con un
 * "pop" -- escala de más grande a su tamaño final con un rebote chico, una
 * sola vez al montarse (ver @keyframes circlecheck-pop). No depende de
 * hover: el componente que lo usa solo lo monta cuando el éxito es real.
 */
export function CircleCheckAnimado({
  className,
  strokeWidth = 1.75,
}: CircleCheckAnimadoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ animation: "circlecheck-pop 400ms var(--ease-motion)" }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m16 9-5.5 5.5L8 12" />
    </svg>
  );
}
