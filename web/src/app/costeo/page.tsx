import Link from "next/link";
import { Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { CalcularCosteoButton } from "@/components/costeo/calcular-costeo-button";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { existeArchivoTarifas } from "@/lib/fs-data";
import { listarCosteables } from "@/lib/costeo-data";

// Se generan/completan registros y se cargan tarifas en cualquier momento
// desde otras secciones, así que esta página no se puede congelar como
// estática en el build.
export const dynamic = "force-dynamic";

export default async function Costeo() {
  const tarifasCargadas = await existeArchivoTarifas();

  if (!tarifasCargadas) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Costeo</h1>
          <p className="text-text-muted mt-1 text-sm">
            Costo real por celda (energía, material, tiempo de máquina), a
            partir de una Hoja de Registro completada.
          </p>
        </div>
        <Reveal>
          <EmptyState
            icon={Calculator}
            title="Todavía no se cargaron las tarifas del taller"
            description="Costeo necesita la tarifa eléctrica, la tarifa hora-máquina y el precio de material para calcular algo — sin eso no hay nada que costear."
            action={
              <LinkButton href="/tarifas" variant="primary">
                Cargar tarifas
              </LinkButton>
            }
          />
        </Reveal>
      </div>
    );
  }

  const costeables = await listarCosteables();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Costeo</h1>
        <p className="text-text-muted mt-1 text-sm">
          Costo real por celda (energía, material, tiempo de máquina), a partir
          de una Hoja de Registro completada.
        </p>
      </div>

      {costeables.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={Calculator}
            title="Todavía no hay ninguna corrida para costear"
            description="Primero completá la evaluación de una corrida en Hoja de Registro — recién ahí se puede calcular su costo."
            action={
              <LinkButton href="/registro" variant="primary">
                Ir a Hoja de Registro
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {costeables.map((corrida, indice) => (
            <Reveal key={corrida.archivoRegistro} delayMs={indice * 40}>
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-navy text-base font-semibold">
                    {corrida.material}
                  </p>
                  <Badge tone={corrida.costeado ? "ok" : "neutral"}>
                    {corrida.costeado ? "Costeado" : "Sin costear"}
                  </Badge>
                </div>
                <p className="text-text-muted text-sm capitalize">
                  {corrida.operacion} · {corrida.espesorMm}mm
                </p>
                <p className="text-text-muted text-xs">
                  {corrida.celdasEvaluadas}/{corrida.totalCeldas} celdas
                  evaluadas
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {corrida.costeado ? (
                    <Link
                      href={`/costeo/${encodeURIComponent(corrida.archivoCosteado)}`}
                      className="text-blue hover:text-blue-hover text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
                    >
                      Ver costos
                    </Link>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    {corrida.costeado ? (
                      <DescargarBoton
                        archivo={corrida.archivoCosteado}
                        etiqueta="Descargar"
                      />
                    ) : null}
                    <CalcularCosteoButton
                      archivoRegistro={corrida.archivoRegistro}
                      archivoCosteado={corrida.archivoCosteado}
                      recalcular={corrida.costeado}
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
