import Link from "next/link";
import { Gauge } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { EliminarGrupoButton } from "@/components/final-run/eliminar-grupo-button";
import { GenerarEjecucionButton } from "@/components/final-run/generar-ejecucion-button";
import { ResumenCalibracion } from "@/components/final-run/resumen-calibracion";
import { listarGruposCalibracion } from "@/lib/final-run-data";
import { MINIMO_EJECUCIONES } from "@/lib/final-run-schema";

// Se generan ejecuciones y se completan registros en cualquier momento,
// así que esta lista no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function FinalRun() {
  const grupos = await listarGruposCalibracion();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">
            Final Run (Calibración)
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Una combinación fija de parámetros, repetida en ejecuciones
            independientes, hasta calibrar su energía real.
          </p>
          <AyudaLink seccion="final-run" />
        </div>
        <LinkButton href="/final-run/nueva" variant="primary">
          Nueva Final Run
        </LinkButton>
      </div>

      {grupos.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={Gauge}
            title="Todavía no hay ningún grupo de calibración"
            description="Fijá la combinación de velocidad y potencia ya elegida para producción y medí su consumo real, repitiendo la corrida en momentos independientes."
            action={
              <LinkButton href="/final-run/nueva" variant="primary">
                Configurar una Final Run
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grupos.map((grupo, indice) => {
            const calibradas = grupo.ejecuciones.filter(
              (e) => e.calibrada,
            ).length;
            const siguienteEjecucion =
              Math.max(0, ...grupo.ejecuciones.map((e) => e.ejecucion)) + 1;
            const todasCalibradas = grupo.ejecuciones.every((e) => e.calibrada);

            return (
              <Reveal key={grupo.grupoId} delayMs={indice * 40}>
                <Card
                  id={grupo.grupoId}
                  data-eliminable
                  accent={grupo.operacion === "corte" ? "blue" : "purple"}
                  className="flex scroll-mt-4 flex-col gap-4 p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-navy text-base font-semibold">
                        {grupo.material}
                      </p>
                      <p className="text-text-muted text-sm capitalize">
                        {grupo.operacion} · {grupo.espesorMm}mm
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge
                        tone={
                          calibradas >= MINIMO_EJECUCIONES ? "ok" : "neutral"
                        }
                      >
                        {calibradas >= MINIMO_EJECUCIONES
                          ? "Calibrado"
                          : "Pendiente"}
                      </Badge>
                      <EliminarGrupoButton
                        grupoId={grupo.grupoId}
                        material={grupo.material}
                      />
                    </div>
                  </div>

                  <p className="text-navy font-mono text-sm">
                    {grupo.velocidadMmMin} mm/min · {grupo.potenciaPct}% ·{" "}
                    {grupo.repeticiones} réplicas
                  </p>

                  <ProgressBar
                    label="Ejecuciones calibradas"
                    value={calibradas}
                    total={Math.max(
                      MINIMO_EJECUCIONES,
                      grupo.ejecuciones.length,
                    )}
                  />

                  <ul className="flex flex-col gap-1.5 text-sm">
                    {grupo.ejecuciones.map((ejecucion) => (
                      <li
                        key={ejecucion.corridaId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-text-muted">
                          Ejecución {ejecucion.ejecucion}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={ejecucion.calibrada ? "ok" : "pendiente"}
                          >
                            {ejecucion.calibrada ? "Medida" : "Sin medir"}
                          </Badge>
                          <Link
                            href={`/registro/${encodeURIComponent(ejecucion.corridaId)}`}
                            className="text-blue hover:text-blue-hover text-xs font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
                          >
                            Completar
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="border-border flex flex-wrap items-start justify-between gap-3 border-t pt-3">
                    <GenerarEjecucionButton
                      grupoId={grupo.grupoId}
                      siguienteEjecucion={siguienteEjecucion}
                    />
                    <ResumenCalibracion
                      grupoId={grupo.grupoId}
                      puedeCalcular={todasCalibradas}
                      fichaEstadoInicial={grupo.fichaEstado}
                    />
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
