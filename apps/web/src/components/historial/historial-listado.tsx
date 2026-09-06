"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { Card, type CardAccent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterAnimado } from "@/components/ui/icons/filter-animado";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { MaterialIcon } from "@/components/suites/material-icon";
import type { CorridaHistorial } from "@/lib/historial-data";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";

interface ConMaterial {
  familia: FamiliaMaterial;
  color: CardAccent;
}

interface HistorialListadoProps {
  corridas: (CorridaHistorial & ConMaterial)[];
}

/** Vista de solo lectura (D, #63) -- resumen ejecutivo, no un explorador de
 * archivos (ver #12): mismo filtro por chips de material que Hoja de
 * Registro, pero sin ningún botón de eliminar/subir/editar. "Ver" navega a
 * Costeo (si ya está costeada) o a Hoja de Registro (si no) -- Historial
 * nunca es la pantalla donde se completa nada. */
export function HistorialListado({ corridas }: HistorialListadoProps) {
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  const materialesPresentes = useMemo(() => {
    const vistos = new Map<
      string,
      { familia: FamiliaMaterial; color: CardAccent }
    >();
    for (const corrida of corridas) {
      if (corrida.material && !vistos.has(corrida.material)) {
        vistos.set(corrida.material, {
          familia: corrida.familia,
          color: corrida.color,
        });
      }
    }
    return [...vistos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [corridas]);

  function alternarMaterial(material: string) {
    setOcultos((anteriores) => {
      const copia = new Set(anteriores);
      if (copia.has(material)) {
        copia.delete(material);
      } else {
        copia.add(material);
      }
      return copia;
    });
  }

  const visibles = corridas.filter((c) => !ocultos.has(c.material));

  return (
    <div className="flex flex-col gap-6">
      {materialesPresentes.length > 1 ? (
        <div
          role="group"
          aria-label="Filtrar por material"
          className="group flex flex-wrap items-center gap-2"
        >
          <FilterAnimado
            className="text-text-muted size-3.5 shrink-0"
            strokeWidth={1.75}
          />
          {materialesPresentes.map(([material, { familia, color }]) => {
            const visible = !ocultos.has(material);
            return (
              <button
                key={material}
                type="button"
                aria-pressed={visible}
                onClick={() => alternarMaterial(material)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                  visible
                    ? "border-border text-navy bg-surface"
                    : "border-border text-text-muted bg-navy-soft line-through opacity-60",
                )}
              >
                <MaterialIcon
                  material={material}
                  familia={familia}
                  color={color}
                  className="size-4"
                />
                {material}
              </button>
            );
          })}
        </div>
      ) : null}

      {visibles.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={Filter}
            title="No hay corridas con los materiales visibles"
            description="Todos los materiales están ocultos por el filtro de arriba — activá alguno para volver a verlas."
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((corrida) => (
            <Card key={corrida.corridaId} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MaterialIcon
                    material={corrida.material}
                    familia={corrida.familia}
                    color={corrida.color}
                  />
                  <div>
                    <p className="text-navy text-base font-semibold capitalize">
                      {corrida.operacion} · {corrida.espesorMm}mm
                    </p>
                    <p className="text-text-muted text-xs">
                      {corrida.material} · lote {corrida.lote} · {corrida.fecha}
                    </p>
                  </div>
                </div>
                <Badge tone={corrida.costeado ? "ok" : "neutral"}>
                  {corrida.costeado
                    ? "Costeada"
                    : corrida.evaluada
                      ? "Evaluada"
                      : "Generada"}
                </Badge>
              </div>

              <ProgressBar
                label="Celdas evaluadas"
                value={corrida.celdasEvaluadas}
                total={corrida.totalCeldas}
              />

              <div className="border-border flex items-center justify-between gap-2 border-t pt-3">
                {corrida.costeado ? (
                  <p className="text-navy font-mono text-sm font-semibold">
                    ${corrida.costoTotalCorrida}
                  </p>
                ) : (
                  <span className="text-text-muted text-xs italic">
                    Sin costear
                  </span>
                )}
                <Link
                  href={
                    corrida.costeado
                      ? `/costeo/${encodeURIComponent(corrida.corridaId)}`
                      : `/registro/${encodeURIComponent(corrida.corridaId)}`
                  }
                  className="text-blue hover:text-blue-hover text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
                >
                  Ver
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
