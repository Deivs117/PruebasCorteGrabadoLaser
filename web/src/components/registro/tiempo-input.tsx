"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { INPUT_CLASSES } from "@/components/ui/field";

interface TiempoInputProps {
  /** Segundos totales, como string (puede venir vacío) — es el único valor
   * que se guarda (columna `tiempo_real_corrida_s`); minutos y segundos son
   * solo otra forma de escribirlo, la CNC del taller reporta el tiempo así. */
  value: string;
  onChange: (segundos: string) => void;
}

type Modo = "segundos" | "minseg";

function aMinSeg(segundosStr: string): { min: string; seg: string } {
  if (segundosStr.trim() === "") return { min: "", seg: "" };
  const total = Number(segundosStr);
  if (!Number.isFinite(total) || total < 0) return { min: "", seg: "" };
  return {
    min: String(Math.floor(total / 60)),
    seg: String(Math.round(total % 60)),
  };
}

export function TiempoInput({ value, onChange }: TiempoInputProps) {
  const [modo, setModo] = useState<Modo>("segundos");
  const { min, seg } = aMinSeg(value);

  function actualizarMinSeg(minNuevo: string, segNuevo: string) {
    if (minNuevo.trim() === "" && segNuevo.trim() === "") {
      onChange("");
      return;
    }
    const m = Number(minNuevo) || 0;
    const s = Number(segNuevo) || 0;
    onChange(String(m * 60 + s));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-navy font-medium">Tiempo real</span>
        <div className="border-border inline-flex overflow-hidden rounded-[var(--radius-sm)] border text-xs">
          {[
            { valor: "segundos" as const, etiqueta: "Segundos" },
            { valor: "minseg" as const, etiqueta: "Min : Seg" },
          ].map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={modo === valor}
              onClick={() => setModo(valor)}
              className={clsx(
                "px-2 py-1 font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                modo === valor
                  ? "bg-blue text-white"
                  : "bg-surface text-navy hover:bg-navy-soft",
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>
      {modo === "segundos" ? (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(INPUT_CLASSES, "w-40 font-mono")}
          aria-label="Tiempo real, en segundos"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            value={min}
            onChange={(e) => actualizarMinSeg(e.target.value, seg)}
            className={clsx(INPUT_CLASSES, "w-16 font-mono")}
            aria-label="Tiempo real, minutos"
          />
          <span className="text-text-muted">min</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step="1"
            value={seg}
            onChange={(e) => actualizarMinSeg(min, e.target.value)}
            className={clsx(INPUT_CLASSES, "w-16 font-mono")}
            aria-label="Tiempo real, segundos"
          />
          <span className="text-text-muted">seg</span>
        </div>
      )}
    </div>
  );
}
