"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";

interface ResumenCalibracionProps {
  grupoId: string;
  puedeCalcular: boolean;
}

interface Resumen {
  nEjecuciones: number;
  kwhPorUnidadMedio: number;
  kwhPorUnidadDesvStd?: number;
  kwhPorUnidadCvPct?: number;
  tiempoPorUnidadMedio: number;
  tiempoPorUnidadDesvStd?: number;
  tiempoPorUnidadCvPct?: number;
  calibrado: boolean;
}

/** Corre `summarize-final-run` de verdad al pedirlo — no es un valor
 * guardado, es un reporte que se recalcula cada vez sobre los csv actuales. */
export function ResumenCalibracion({
  grupoId,
  puedeCalcular,
}: ResumenCalibracionProps) {
  const [estado, setEstado] = useState<
    "idle" | "calculando" | "listo" | "error"
  >("idle");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [mensajeError, setMensajeError] = useState("");

  async function calcular() {
    setEstado("calculando");
    try {
      const respuesta = await fetch(
        `/api/final-run/${encodeURIComponent(grupoId)}/resumen`,
        {
          method: "POST",
        },
      );
      const cuerpo = (await respuesta.json()) as
        (Resumen & { ok: true }) | { ok: false; error: string };
      if (cuerpo.ok) {
        setResumen(cuerpo);
        setEstado("listo");
      } else {
        setMensajeError(cuerpo.error);
        setEstado("error");
      }
    } catch {
      setMensajeError("No se pudo conectar con el taller.");
      setEstado("error");
    }
  }

  if (estado === "listo" && resumen) {
    return (
      <div aria-live="polite" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={resumen.calibrado ? "ok" : "pendiente"}>
            {resumen.calibrado ? "Calibrado" : "Pendiente"}
          </Badge>
          <p className="text-text-muted text-xs">
            {resumen.nEjecuciones} ejecuciones analizadas
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-text-muted">kWh por unidad</dt>
            <dd className="text-navy font-mono font-medium">
              {resumen.kwhPorUnidadMedio.toFixed(6)}
              {resumen.kwhPorUnidadCvPct !== undefined ? (
                <span className="text-text-muted ml-1 text-xs font-normal">
                  (CV {resumen.kwhPorUnidadCvPct.toFixed(1)}%)
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Tiempo por unidad</dt>
            <dd className="text-navy font-mono font-medium">
              {resumen.tiempoPorUnidadMedio.toFixed(2)}s
              {resumen.tiempoPorUnidadCvPct !== undefined ? (
                <span className="text-text-muted ml-1 text-xs font-normal">
                  (CV {resumen.tiempoPorUnidadCvPct.toFixed(1)}%)
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        <Button variant="outline" size="sm" onClick={calcular}>
          Recalcular
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={calcular}
        disabled={!puedeCalcular}
        loading={estado === "calculando"}
      >
        {estado === "calculando" ? "Calculando…" : "Calcular resumen"}
      </Button>
      {!puedeCalcular ? (
        <p className="text-text-muted text-xs">
          Faltan cargar el kWh medido y el tiempo real de alguna ejecución.
        </p>
      ) : null}
      {estado === "error" ? (
        <p role="alert" className="text-orange flex items-center gap-1 text-xs">
          <TriangleAlertAnimado className="size-3.5" />
          {mensajeError}
        </p>
      ) : null}
    </div>
  );
}
