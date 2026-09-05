interface FlaskConicalAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `FlaskConical` (lucide-react) con dos burbujas agregadas
 * adentro del frasco -- ocultas en reposo, suben y desvanecen en loop
 * (ver @keyframes flask-burbuja) mientras dura el hover, con un
 * animation-delay distinto cada una para que no suban juntas.
 */
export function FlaskConicalAnimado({
  className,
  strokeWidth = 1.75,
}: FlaskConicalAnimadoProps) {
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
      <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
      <path d="M6.453 15h11.094" />
      <path d="M8.5 2h7" />
      {/* Burbujas -- ocultas en reposo, suben en loop al pasar el mouse. */}
      <circle
        cx="10.3"
        cy="18.5"
        r="0.6"
        fill="currentColor"
        stroke="none"
        className="opacity-0 group-hover:animate-[flask-burbuja_1100ms_ease-out_infinite] group-hover:opacity-100"
      />
      <circle
        cx="13"
        cy="17.5"
        r="0.5"
        fill="currentColor"
        stroke="none"
        style={{ animationDelay: "400ms" }}
        className="opacity-0 group-hover:animate-[flask-burbuja_1100ms_ease-out_infinite] group-hover:opacity-100"
      />
    </svg>
  );
}
