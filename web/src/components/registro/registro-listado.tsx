"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { clsx } from "clsx";
import { Card, type CardAccent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { EliminarCorridaButton } from "@/components/registro/eliminar-corrida-button";
import { MaterialIcon } from "@/components/suites/material-icon";
import type { CorridaGenerada, CorridaPreparada } from "@/lib/registro-data";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";
import { PrepararRegistroButton } from "@/components/registro/preparar-registro-button";

interface ConMaterial {
  material: string;
  familia: FamiliaMaterial;
  color: CardAccent;
}

interface RegistroListadoProps {
  generadas: (CorridaGenerada & ConMaterial)[];
  preparadas: (CorridaPreparada & ConMaterial)[];
}

/** Igual que el filtro de Suites de Prueba: una leyenda de materiales
 * (combinando ambas secciones) que oculta/muestra corridas al clickear un
 * chip — útil el día que se están corriendo pruebas de un material nuevo y
 * las de MDF de días anteriores solo estorban. */
export function RegistroListado({
  generadas,
  preparadas,
}: RegistroListadoProps) {
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  const materialesPresentes = useMemo(() => {
    const vistos = new Map<
      string,
      { familia: FamiliaMaterial; color: CardAccent }
    >();
    for (const corrida of [...generadas, ...preparadas]) {
      if (corrida.material && !vistos.has(corrida.material)) {
        vistos.set(corrida.material, {
          familia: corrida.familia,
          color: corrida.color,
        });
      }
    }
    return [...vistos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [generadas, preparadas]);

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

  const generadasVisibles = generadas.filter((c) => !ocultos.has(c.material));
  const preparadasVisibles = preparadas.filter((c) => !ocultos.has(c.material));
  const hayVisibles =
    generadasVisibles.length > 0 || preparadasVisibles.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {materialesPresentes.length > 1 ? (
        <div
          role="group"
          aria-label="Filtrar por material"
          className="flex flex-wrap items-center gap-2"
        >
          <Filter
            className="text-text-muted size-3.5 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
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

      {!hayVisibles ? (
        <Reveal>
          <EmptyState
            icon={Filter}
            title="No hay corridas con los materiales visibles"
            description="Todos los materiales están ocultos por el filtro de arriba — activá alguno para volver a verlas."
          />
        </Reveal>
      ) : null}

      {generadasVisibles.length > 0 ? (
        <Reveal>
          <section className="flex flex-col gap-3">
            <h2 className="text-navy text-base font-semibold">
              Corridas por preparar
            </h2>
            <p className="text-text-muted text-sm">
              Ya se generó su G-code, pero todavía no tienen la Hoja de Registro
              lista para completar.
            </p>
            <div className="flex flex-col gap-2">
              {generadasVisibles.map((corrida) => (
                <Card
                  key={corrida.archivo}
                  data-eliminable
                  className="flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-2">
                    <MaterialIcon
                      material={corrida.material}
                      familia={corrida.familia}
                      color={corrida.color}
                    />
                    <p className="text-navy font-mono text-sm">
                      {corrida.corridaId}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DescargarBoton
                      archivo={corrida.archivo}
                      etiqueta="Descargar CSV"
                    />
                    <DescargarBoton
                      archivo={corrida.archivo.replace(/\.csv$/, ".gcode")}
                      etiqueta="Descargar G-code"
                    />
                    <PrepararRegistroButton archivo={corrida.archivo} />
                    <EliminarCorridaButton corridaId={corrida.corridaId} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      {preparadasVisibles.length > 0 ? (
        <Reveal delayMs={60}>
          <section className="flex flex-col gap-3">
            <h2 className="text-navy text-base font-semibold">
              Registros preparados
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {preparadasVisibles.map((corrida) => (
                <Card
                  key={corrida.archivo}
                  data-eliminable
                  className="flex flex-col gap-3 p-5"
                >
                  <Link
                    href={`/registro/${encodeURIComponent(corrida.archivo)}`}
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
                      archivo={corrida.corridaId + ".gcode"}
                      etiqueta="G-code"
                    />
                    <EliminarCorridaButton corridaId={corrida.corridaId} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}
