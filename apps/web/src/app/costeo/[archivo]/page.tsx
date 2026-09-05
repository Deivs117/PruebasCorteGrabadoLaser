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
}: PageProps<"/costeo/[archivo]">) {
  const { archivo: archivoParam } = await params;
  const archivo = decodeURIComponent(archivoParam);
  const [filas, tarifas] = await Promise.all([
    leerCosteo(archivo),
    leerTarifas(),
  ]);
  const primera = filas?.[0];

  if (!filas || !primera) {
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
            {primera.material} · {primera.espesor_mm}mm · {primera.operacion} ·
            lote {primera.lote}
          </p>
        </div>
        <DescargarBoton archivo={archivo} etiqueta="Descargar costeo" />
      </div>

      <CostoTabla filas={filas} moneda={moneda} />

      <section className="flex flex-col gap-3">
        <h2 className="text-navy text-base font-semibold">
          Costo por combinación
        </h2>
        <CostoHeatmap filas={filas} moneda={moneda} />
      </section>
    </div>
  );
}
