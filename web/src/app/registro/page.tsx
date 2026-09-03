import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { PrepararRegistroButton } from "@/components/registro/preparar-registro-button";
import { listarCorridas } from "@/lib/registro-data";

// Se generan y preparan corridas en cualquier momento desde otras secciones
// (o a mano en la máquina), así que esta lista no se puede congelar como
// estática en el build.
export const dynamic = "force-dynamic";

export default async function HojaDeRegistro() {
  const { generadas, preparadas } = await listarCorridas();
  const sinNada = generadas.length === 0 && preparadas.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
        <p className="text-text-muted mt-1 text-sm">
          Evaluación celda por celda de las corridas que ya se corrieron en la
          máquina.
        </p>
      </div>

      {sinNada ? (
        <Reveal>
          <EmptyState
            icon={ClipboardList}
            title="Todavía no hay ninguna corrida para registrar"
            description="Primero generá una suite de prueba y corré su G-code en la máquina — recién ahí vas a poder completar acá la evaluación de cada celda."
            action={
              <LinkButton href="/suites" variant="primary">
                Ir a Suites de Prueba
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <>
          {generadas.length > 0 ? (
            <Reveal>
              <section className="flex flex-col gap-3">
                <h2 className="text-navy text-base font-semibold">
                  Corridas por preparar
                </h2>
                <p className="text-text-muted text-sm">
                  Ya se generó su G-code, pero todavía no tienen la Hoja de
                  Registro lista para completar.
                </p>
                <div className="flex flex-col gap-2">
                  {generadas.map((corrida) => (
                    <Card
                      key={corrida.archivo}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <p className="text-navy font-mono text-sm">
                        {corrida.corridaId}
                      </p>
                      <PrepararRegistroButton archivo={corrida.archivo} />
                    </Card>
                  ))}
                </div>
              </section>
            </Reveal>
          ) : null}

          {preparadas.length > 0 ? (
            <Reveal delayMs={60}>
              <section className="flex flex-col gap-3">
                <h2 className="text-navy text-base font-semibold">
                  Registros preparados
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {preparadas.map((corrida) => (
                    <Link
                      key={corrida.archivo}
                      href={`/registro/${encodeURIComponent(corrida.archivo)}`}
                      className="block rounded-[var(--radius-lg)] transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] hover:-translate-y-0.5"
                    >
                      <Card className="flex flex-col gap-3 p-5">
                        <p className="text-navy text-base font-semibold">
                          {corrida.material}
                        </p>
                        <p className="text-text-muted text-sm capitalize">
                          {corrida.operacion} · {corrida.espesorMm}mm
                        </p>
                        <ProgressBar
                          label="Celdas evaluadas"
                          value={corrida.celdasEvaluadas}
                          total={corrida.totalCeldas}
                        />
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            </Reveal>
          ) : null}
        </>
      )}
    </div>
  );
}
