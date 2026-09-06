import { AyudaLink } from "@/components/ui/ayuda-link";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ClipboardListAnimado } from "@/components/ui/icons/clipboard-list-animado";
import { FlaskConicalAnimado } from "@/components/ui/icons/flask-conical-animado";
import { GaugeAnimado } from "@/components/ui/icons/gauge-animado";
import { ShapesAnimado } from "@/components/ui/icons/shapes-animado";
import { SkeletonStatTile } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `getDashboardSummary()`. El encabezado y "Accesos rápidos" son estáticos
 * (no dependen del fetch) y se repiten tal cual; los avisos y el estado
 * vacío sí dependen del resumen, así que no se intentan adivinar acá —
 * solo las tres cifras se marcan como skeleton.
 */
export default function CargandoInicio() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Inicio</h1>
        <p className="text-text-muted mt-1 text-sm">
          Así está el taller ahora mismo.
        </p>
        <AyudaLink seccion="inicio" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonStatTile />
        <SkeletonStatTile />
        <SkeletonStatTile />
      </div>

      <section aria-labelledby="accesos-titulo" className="flex flex-col gap-3">
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
    </div>
  );
}
