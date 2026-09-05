interface HelpCircleAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `HelpCircle` (lucide-react): el signo de pregunta se
 * balancea suave en loop lento mientras dura el hover -- invita a hacer
 * click, sin urgencia (ver @keyframes helpcircle-balanceo).
 */
export function HelpCircleAnimado({
  className,
  strokeWidth = 1.75,
}: HelpCircleAnimadoProps) {
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
      <g
        style={{ transformOrigin: "12px 11px" }}
        className="group-hover:animate-[helpcircle-balanceo_1400ms_ease-in-out_infinite]"
      >
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </g>
    </svg>
  );
}
