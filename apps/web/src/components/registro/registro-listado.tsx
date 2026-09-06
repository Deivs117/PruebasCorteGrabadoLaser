"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { clsx } from "clsx";
import { Card, type CardAccent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterAnimado } from "@/components/ui/icons/filter-animado";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { EliminarCorridaButton } from "@/components/registro/eliminar-corrida-button";
import { MaterialIcon } from "@/components/suites/material-icon";
import type { ResumenRegistro } from "@/lib/registro-data";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";

interface ConMaterial {
  material: string;
  familia: FamiliaMaterial;
  color: CardAccent;
}

interface RegistroListadoProps {
  registros: (ResumenRegistro & ConMaterial)[];
}

/** Igual que el filtro de Suites de Prueba: una leyenda de materiales que
 * oculta/muestra corridas al clickear un chip — útil el día que se están
 * corriendo pruebas de un material nuevo y las de MDF de días anteriores
 * solo estorban. */
export function RegistroListado({ registros }: RegistroListadoProps) {
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  const materialesPresentes = useMemo(() => {
    const vistos = new Map<
      string,
      { familia: FamiliaMaterial; color: CardAccent }
    >();
    for (const corrida of registros) {
      if (corrida.material && !vistos.has(corrida.material)) {
        vistos.set(corrida.material, {
          familia: corrida.familia,
          color: corrida.color,
        });
      }
    }
    return [...vistos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [registros]);

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

  const visibles = registros.filter((c) => !ocultos.has(c.material));

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
            <Card
              key={corrida.corridaId}
              data-eliminable
              className="flex flex-col gap-3 p-5"
            >
              <Link
                href={`/registro/${encodeURIComponent(corrida.corridaId)}`}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <MaterialIcon
                    material={corrida.material}
                    familia={corrida.familia}
                    color={corrida.color}
                  />
                  <p className="text-navy text-base font-semibold capitalize">
                    {corrida.operacion} · {corrida.espesorMm}mm
                  </p>
                </div>
                <ProgressBar
                  label="Celdas evaluadas"
                  value={corrida.celdasEvaluadas}
                  total={corrida.totalCeldas}
                />
              </Link>
              <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <DescargarBoton
                  archivo={`${corrida.corridaId}.gcode`}
                  etiqueta="G-code"
                  endpointBase="/api/descargas/gcode"
                />
                {corrida.origen === "suite" ? (
                  <EliminarCorridaButton corridaId={corrida.corridaId} />
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
