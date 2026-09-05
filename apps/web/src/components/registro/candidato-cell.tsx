"use client";

import { clsx } from "clsx";
import { Star } from "lucide-react";
import { useLongPress } from "@/lib/use-long-press";

interface CandidatoCellProps {
  idPrueba: string;
  velocidadMmMin: string;
  potenciaPct: string;
  marcado: boolean;
  onMarcar: () => void;
  onDesmarcar: () => void;
}

/**
 * Identifica una celda (id + velocidad + potencia) y a la vez sirve de
 * gatillo para marcarla como candidata a Final Run: mantener presionado
 * ilumina la celda de amarillo progresivamente, y al completar el gesto se
 * marca (confirmado con un toast, no con otro formulario). Ya marcada, un
 * click la desmarca.
 */
export function CandidatoCell({
  idPrueba,
  velocidadMmMin,
  potenciaPct,
  marcado,
  onMarcar,
  onDesmarcar,
}: CandidatoCellProps) {
  const { presionando, duracionMs, handlers } = useLongPress({
    onLongPress: onMarcar,
  });

  if (marcado) {
    return (
      <button
        type="button"
        onClick={onDesmarcar}
        title="Quitar de candidatos a Final Run"
        className="bg-orange-soft border-orange flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] hover:brightness-95"
      >
        <span className="text-orange flex items-center gap-1 text-[0.65rem] font-semibold tracking-wide uppercase">
          <Star className="h-3 w-3 fill-current" aria-hidden />
          Candidata a Final Run
        </span>
        <span className="text-navy font-mono text-sm">
          {idPrueba} · {velocidadMmMin} mm/min · {potenciaPct}%
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      {...handlers}
      aria-label={`Celda ${idPrueba}, ${velocidadMmMin} milímetros por minuto, ${potenciaPct} por ciento. Mantener presionado para marcar como candidata a Final Run.`}
      className={clsx(
        "relative flex w-full flex-col items-start gap-0.5 overflow-hidden rounded-[var(--radius-sm)] border px-3 py-2 text-left",
        "border-border",
      )}
      style={{
        transition: `background-color ${duracionMs}ms linear, border-color ${duracionMs}ms linear`,
        backgroundColor: presionando ? "var(--color-orange)" : "transparent",
        borderColor: presionando ? "var(--color-orange)" : undefined,
      }}
    >
      <span className="text-navy relative font-mono text-sm">{idPrueba}</span>
      <span className="text-text-muted relative font-mono text-xs">
        {velocidadMmMin} mm/min · {potenciaPct}%
      </span>
    </button>
  );
}
