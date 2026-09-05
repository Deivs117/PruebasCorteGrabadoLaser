interface ClipboardListAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `ClipboardList` (lucide-react): al pasar el mouse, la
 * última línea de la lista se "tilda" -- aparece un check chico al lado,
 * como si se acabara de marcar un registro.
 */
export function ClipboardListAnimado({
  className,
  strokeWidth = 1.75,
}: ClipboardListAnimadoProps) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M8 11h.01" />
      {/* Última línea + su punto -- se ocultan detrás del check al pasar
          el mouse, en vez de convivir con él. */}
      <g className="transition-opacity duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:opacity-0">
        <path d="M12 16h4" />
        <path d="M8 16h.01" />
      </g>
      {/* Check -- aparece con un "pop" chico al pasar el mouse. */}
      <g
        style={{ transformOrigin: "9px 16px" }}
        className="scale-50 opacity-0 transition-[transform,opacity] duration-[var(--duration-quick)] ease-[var(--ease-motion)] group-hover:scale-100 group-hover:opacity-100"
      >
        <path d="m7 16 1.3 1.3L11 14.6" />
      </g>
    </svg>
  );
}
