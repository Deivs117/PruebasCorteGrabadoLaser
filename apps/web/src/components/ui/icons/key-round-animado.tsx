interface KeyRoundAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `KeyRound` (lucide-react) para el ítem de sidebar del Panel
 * de Generación de Credenciales (#117): al hacer hover, gira en vaivén
 * alrededor del ojal (el círculo del cabezal), como girando en una
 * cerradura -- loop mientras dura el hover, mismo criterio de "gesto que
 * describe la acción" que `Settings2Animado`.
 */
export function KeyRoundAnimado({
  className,
  strokeWidth = 1.75,
}: KeyRoundAnimadoProps) {
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
        style={{ transformOrigin: "16.5px 7.5px" }}
        className="group-hover:animate-[keyround-gira_900ms_ease-in-out_infinite]"
      >
        <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
        <circle cx="16.5" cy="7.5" r="0.5" fill="currentColor" />
      </g>
    </svg>
  );
}
