import { FlaskConical } from "lucide-react";
import { AlertBanner } from "@/components/ui/alert-banner";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ClipboardListAnimado } from "@/components/ui/icons/clipboard-list-animado";
import { FlaskConicalAnimado } from "@/components/ui/icons/flask-conical-animado";
import { GaugeAnimado } from "@/components/ui/icons/gauge-animado";
import { ShapesAnimado } from "@/components/ui/icons/shapes-animado";
import { Reveal } from "@/components/ui/reveal";
import { StatTile } from "@/components/ui/stat-tile";
import { getDashboardSummary } from "@/lib/fs-data";

// El estado del taller (suites, corridas, fichas) puede cambiar en cualquier
// momento fuera de este proceso, así que esta página no se puede congelar
// como estática en el build.
export const dynamic = "force-dynamic";

export default async function Inicio() {
  const resumen = await getDashboardSummary();

  const sinCorridas = resumen.registros === 0;

  const avisos: string[] = [];
  if (!resumen.tarifasConfiguradas) {
    avisos.push(
      "Todavía no se cargaron las tarifas del taller (electricidad, hora-máquina, material) — sin esto, Costeo no puede calcular montos.",
    );
  }
  if (resumen.fichasOficiales === 0) {
    avisos.push(
      "Todavía no hay ninguna Ficha de Parámetro Estándar publicada.",
    );
  }
  if (resumen.registros === 0) {
    avisos.push("Todavía no se registró ninguna corrida de prueba.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Inicio</h1>
        <p className="text-text-muted mt-1 text-sm">
          Así está el taller ahora mismo.
        </p>
        <AyudaLink seccion="inicio" />
      </div>

      <Reveal>
        <AlertBanner title="Pendientes que requieren atención" items={avisos} />
      </Reveal>

      <Reveal delayMs={60}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Suites configuradas"
            value={resumen.suitesBarrido + resumen.suitesFinalRun}
            helpText={`${resumen.suitesBarrido} de barrido · ${resumen.suitesFinalRun} final run`}
          />
          <StatTile
            label="Corridas registradas"
            value={resumen.registros}
            helpText={`${resumen.registrosCompletados} con medición de corrida completa`}
          />
          <StatTile
            label="Fichas oficiales"
            value={resumen.fichasOficiales}
            helpText="Fichas de Parámetro Estándar validadas"
          />
        </div>
      </Reveal>

      {sinCorridas ? (
        <Reveal delayMs={120}>
          <EmptyState
            icon={FlaskConical}
            title="Todavía no corriste ninguna prueba"
            description="Ya hay suites de prueba configuradas, pero todavía no se registró ninguna corrida real: presioná para agregar y configurar una prueba, generar su G-code y empezar a registrar resultados."
            action={
              <LinkButton href="/suites" variant="primary">
                Configurar una suite de prueba
              </LinkButton>
            }
          />
        </Reveal>
      ) : null}

      <Reveal delayMs={180}>
        <section
          aria-labelledby="accesos-titulo"
          className="flex flex-col gap-3"
        >
          <h2 id="accesos-titulo" className="text-navy text-base font-semibold">
            Accesos rápidos
          </h2>
          <Card className="flex flex-wrap gap-3 p-4">
            <LinkButton href="/suites" variant="primary">
              <FlaskConicalAnimado className="size-4" strokeWidth={1.75} />
              Nueva suite de prueba
            </LinkButton>
            <LinkButton href="/grabado-svg" variant="secondary">
              <ShapesAnimado className="size-4" strokeWidth={1.75} />
              Importar SVG
            </LinkButton>
            <LinkButton href="/final-run" variant="secondary">
              <GaugeAnimado className="size-4" strokeWidth={1.75} />
              Nueva Final Run
            </LinkButton>
            <LinkButton href="/registro" variant="outline">
              <ClipboardListAnimado className="size-4" strokeWidth={1.75} />
              Hoja de Registro
            </LinkButton>
          </Card>
        </section>
      </Reveal>
    </div>
  );
}
