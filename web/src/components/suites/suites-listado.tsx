"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Pencil } from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { Card, type CardAccent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { DuplicarSuiteButton } from "@/components/suites/duplicar-suite-button";
import { EliminarSuiteButton } from "@/components/suites/eliminar-suite-button";
import { MaterialIcon } from "@/components/suites/material-icon";
import { iconButtonClasses } from "@/lib/button-styles";
import type { SuiteConfig } from "@/lib/fs-data";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";
import { tiempoRelativo } from "@/lib/tiempo-relativo";

export interface SuiteConfigConMaterial extends SuiteConfig {
  familia: FamiliaMaterial;
  color: CardAccent;
}

interface SuitesListadoProps {
  suites: SuiteConfigConMaterial[];
}

/** Lista de Suites de Prueba, con leyenda-filtro de materiales arriba: cada
 * material presente aparece como un chip con su ícono+color, y clickearlo
 * lo oculta/muestra — para no tener que scrollear entre materiales que no
 * te interesan hoy (ej. esconder MDF mientras probás un polímero). */
export function SuitesListado({ suites }: SuitesListadoProps) {
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  const materialesPresentes = useMemo(() => {
    const vistos = new Map<
      string,
      { familia: FamiliaMaterial; color: CardAccent }
    >();
    for (const suite of suites) {
      if (!vistos.has(suite.material)) {
        vistos.set(suite.material, {
          familia: suite.familia,
          color: suite.color,
        });
      }
    }
    return [...vistos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [suites]);

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

  const suitesVisibles = suites.filter((s) => !ocultos.has(s.material));

  return (
    <div className="flex flex-col gap-4">
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

      {suitesVisibles.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={Filter}
            title="No hay suites con los materiales visibles"
            description="Todos los materiales están ocultos por el filtro de arriba — activá alguno para volver a verlas."
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suitesVisibles.map((suite, indice) => (
            <Reveal key={suite.archivo} delayMs={indice * 40}>
              <Card
                data-eliminable
                accent={suite.operacion === "corte" ? "blue" : "purple"}
                className="flex flex-col gap-3 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MaterialIcon
                      material={suite.material}
                      familia={suite.familia}
                      color={suite.color}
                    />
                    <p className="text-navy text-base font-semibold capitalize">
                      {suite.operacion} · {suite.espesorMm}mm
                    </p>
                  </div>
                  <Badge tone={suite.tipo === "final_run" ? "ok" : "neutral"}>
                    {suite.tipo === "final_run" ? "Final run" : "Barrido"}
                  </Badge>
                </div>
                {suite.tipo === "barrido" ? (
                  <p className="text-navy font-mono text-sm">
                    {(suite.velocidadesMmMin?.length ?? 0) *
                      (suite.potenciasPct?.length ?? 0)}{" "}
                    celdas
                  </p>
                ) : (
                  <p className="text-navy font-mono text-sm">
                    {suite.velocidadMmMin} mm/min · {suite.potenciaPct}%
                  </p>
                )}
                <div className="border-border flex items-center justify-between gap-2 border-t pt-3">
                  <p className="text-text-muted text-xs">
                    Creada {tiempoRelativo(suite.creadoEn)}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {suite.tipo === "barrido" ? (
                      <>
                        <Link
                          href={`/suites/${encodeURIComponent(suite.archivo)}/editar`}
                          aria-label={`Editar suite de ${suite.material}`}
                          className={iconButtonClasses()}
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </Link>
                        <DuplicarSuiteButton
                          archivo={suite.archivo}
                          material={suite.material}
                          espesorMm={suite.espesorMm}
                          operacion={suite.operacion}
                          loteActual={suite.lote}
                        />
                      </>
                    ) : null}
                    <EliminarSuiteButton
                      archivo={suite.archivo}
                      material={suite.material}
                    />
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
