interface GaugeAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Gauge` (lucide-react) -- pedido explícito del técnico para
 * Final Run (Calibración): animación de dos actos. Al pasar el mouse, la
 * aguja barre desde abajo hasta el máximo (ver @keyframes gauge-barrido,
 * una sola vez) y recién cuando el barrido termina aparece un check chico
 * abajo -- referencia visual a "calibración cumplida" -- con
 * transition-delay ajustado a la duración del barrido, no una transición
 * en paralelo.
 */
export function GaugeAnimado({
  className,
  strokeWidth = 1.75,
}: GaugeAnimadoProps) {
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
      {/* Arco -- fijo. */}
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      {/* Aguja -- pivota desde el centro del arco, barre una vez al pasar
          el mouse (acto 1). */}
      <g
        style={{ transformOrigin: "12px 15px" }}
        className="group-hover:animate-[gauge-barrido_450ms_ease-out_forwards]"
      >
        <path d="m12 14 4-4" />
      </g>
      {/* Check -- oculto en reposo, aparece recién cuando termina el
          barrido (acto 2). */}
      <g
        style={{ transformOrigin: "12px 19px" }}
        className="scale-50 opacity-0 transition-[transform,opacity] delay-[450ms] duration-200 ease-[var(--ease-motion)] group-hover:scale-100 group-hover:opacity-100"
      >
        <path d="m9.5 19 1.5 1.5L14.5 17" />
      </g>
    </svg>
  );
}
