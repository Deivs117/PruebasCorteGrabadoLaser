interface Settings2AnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Settings2` (lucide-react): este ícono es en realidad un par
 * de controles deslizantes (un círculo = perilla, la línea = riel), no
 * engranajes con dientes -- así que en vez de "girar" (invisible en un
 * círculo simétrico), la perilla derecha se desliza en vaivén sobre su
 * riel en loop mientras dura el hover, como ajustando. La izquierda queda
 * fija, para no competir por atención.
 */
export function Settings2Animado({
  className,
  strokeWidth = 1.75,
}: Settings2AnimadoProps) {
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
      <path d="M19 7h-9" />
      <circle cx="7" cy="7" r="3" />
      <path d="M14 17H5" />
      <g
        style={{ transformOrigin: "17px 17px" }}
        className="group-hover:animate-[settings2-ajuste_900ms_ease-in-out_infinite]"
      >
        <circle cx="17" cy="17" r="3" />
      </g>
    </svg>
  );
}
