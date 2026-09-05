interface TriangleAlertAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `TriangleAlert` (lucide-react) para errores y advertencias:
 * al aparecer, un temblor horizontal corto (patrón "Error Shake", sin
 * rebote -- ver @keyframes trianglealert-shake). No depende de hover: el
 * componente que lo usa solo lo monta cuando el error es real, así que la
 * animación juega una sola vez apenas aparece.
 */
export function TriangleAlertAnimado({
  className,
  strokeWidth = 1.75,
}: TriangleAlertAnimadoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ animation: "trianglealert-shake 400ms var(--ease-motion)" }}
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
