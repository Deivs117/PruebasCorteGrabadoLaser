import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { EliminarSuiteButton } from "@/components/suites/eliminar-suite-button";
import { listarSuites } from "@/lib/fs-data";

// Nuevas suites se agregan en cualquier momento (desde el asistente o a
// mano), así que esta lista no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function SuitesDePrueba() {
  const suites = await listarSuites();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Suites de Prueba</h1>
          <p className="text-text-muted mt-1 text-sm">
            Cada suite es un barrido de velocidad y potencia listo para correr
            en la máquina.
          </p>
        </div>
        <LinkButton href="/suites/nueva" variant="primary">
          Nueva suite de prueba
        </LinkButton>
      </div>

      {suites.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={FlaskConical}
            title="Todavía no hay ninguna suite configurada"
            description="Presioná para agregar y configurar una prueba: elegís el material, el barrido de velocidad y potencia, y se genera el G-code al final."
            action={
              <LinkButton href="/suites/nueva" variant="primary">
                Configurar una suite de prueba
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite, indice) => (
            <Reveal key={suite.archivo} delayMs={indice * 40}>
              <Card
                accent={suite.operacion === "corte" ? "blue" : "purple"}
                className="flex flex-col gap-3 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-navy text-base font-semibold">
                    {suite.material}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={suite.tipo === "final_run" ? "ok" : "neutral"}>
                      {suite.tipo === "final_run" ? "Final run" : "Barrido"}
                    </Badge>
                    <EliminarSuiteButton
                      archivo={suite.archivo}
                      material={suite.material}
                    />
                  </div>
                </div>
                <p className="text-text-muted text-sm capitalize">
                  {suite.operacion} · {suite.espesorMm}mm
                </p>
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
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
