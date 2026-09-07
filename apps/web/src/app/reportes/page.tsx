import { BarChart3 } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CostoPorComboChart } from "@/components/reportes/costo-por-combo-chart";
import { CostoPromedioTabla } from "@/components/reportes/costo-promedio-tabla";
import { ExportarCsvButton } from "@/components/reportes/exportar-csv-button";
import { ExportarPdfButton } from "@/components/fichas/exportar-pdf-button";
import { KwhEvolucionChart } from "@/components/reportes/kwh-evolucion-chart";
import { leerReportes } from "@/lib/reportes-data";
import { leerTarifas } from "@/lib/tarifas-data";

// Costos/calibraciones cambian con cada corrida costeada, así que esta
// pantalla no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function Reportes() {
  const [reportes, tarifas] = await Promise.all([
    leerReportes(),
    leerTarifas(),
  ]);
  const moneda = tarifas.moneda || "?";
  const sinDatos =
    reportes.costoPromedioPorCombo.length === 0 &&
    reportes.serieKwhCalibrado.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Reportes</h1>
          <p className="text-text-muted mt-1 text-sm">
            Detalle por material, espesor y operación puntual: costo promedio y
            evolución de kWh/unidad calibrado en el tiempo. Para el panorama
            general por familia de material, ver Historial.
          </p>
          <AyudaLink seccion="reportes" />
        </div>
        {!sinDatos && (
          <div className="flex gap-2">
            <ExportarCsvButton combos={reportes.costoPromedioPorCombo} />
            <ExportarPdfButton />
          </div>
        )}
      </div>

      {sinDatos ? (
        <EmptyState
          icon={BarChart3}
          title="Todavía no hay datos para reportar"
          description="Este reporte se arma con corridas ya costeadas (Hoja de Registro/Costeo) y Final Run con energía medida (Final Run/Calibración) -- corré y completá algunas para que aparezca algo acá."
        />
      ) : (
        <div data-reportes-imprimible className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-navy text-lg font-semibold">
                Costo promedio por material, espesor y operación
              </h2>
              <p className="text-text-muted text-xs">
                {reportes.totales.nCorridas} corridas · {moneda}{" "}
                {reportes.totales.costoAcumulado} acumulado
              </p>
            </div>
            <CostoPorComboChart
              combos={reportes.costoPromedioPorCombo}
              moneda={moneda}
            />
            <CostoPromedioTabla
              combos={reportes.costoPromedioPorCombo}
              moneda={moneda}
            />
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-navy text-lg font-semibold">
              Evolución de kWh/unidad calibrado
            </h2>
            {reportes.serieKwhCalibrado.length === 0 ? (
              <p className="text-text-muted text-sm italic">
                Todavía no hay ninguna Final Run con energía medida -- este
                gráfico aparece por grupo de calibración apenas haya al menos
                una ejecución con kWh cargado.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reportes.serieKwhCalibrado.map((grupo) => (
                  <KwhEvolucionChart
                    key={grupo.grupoCalibracionId}
                    grupo={grupo}
                  />
                ))}
              </div>
            )}
          </Card>

          <p className="text-text-muted text-xs italic">
            &quot;Ahorro estimado tras calibrar&quot;: pendiente -- todavía no
            hay una línea base de comparación definida para calcularlo.
          </p>
        </div>
      )}
    </div>
  );
}
