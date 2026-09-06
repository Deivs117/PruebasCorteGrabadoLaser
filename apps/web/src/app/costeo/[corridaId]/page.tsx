import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { CostoHeatmap } from "@/components/costeo/costo-heatmap";
import { CostoTabla } from "@/components/costeo/costo-tabla";
import { leerCosteo } from "@/lib/costeo-data";
import { leerTarifas } from "@/lib/tarifas-data";

export const dynamic = "force-dynamic";

export default async function DetalleCosteo({
  params,
}: PageProps<"/costeo/[corridaId]">) {
  const { corridaId: corridaIdParam } = await params;
  const corridaId = decodeURIComponent(corridaIdParam);
  const [detalle, tarifas] = await Promise.all([
    leerCosteo(corridaId),
    leerTarifas(),
  ]);

  if (!detalle) {
    notFound();
  }

  const moneda = tarifas.moneda || "TBD";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/costeo" label="Volver a Costeo" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Costeo</h1>
          <p className="text-text-muted mt-1 text-sm capitalize">
            {detalle.material} · {detalle.espesorMm}mm · {detalle.operacion} ·
            lote {detalle.lote}
          </p>
        </div>
        <DescargarBoton
          archivo={`${corridaId}.gcode`}
          etiqueta="Descargar G-code"
          endpointBase="/api/descargas/gcode"
        />
      </div>

      <CostoTabla filas={detalle.celdas} moneda={moneda} />

      <section className="flex flex-col gap-3">
        <h2 className="text-navy text-base font-semibold">
          Costo por combinación
        </h2>
        <CostoHeatmap filas={detalle.celdas} moneda={moneda} />
      </section>
    </div>
  );
}
