import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";

const COLUMNAS = [
  "Celda",
  "Velocidad",
  "Potencia",
  "Energía",
  "Material",
  "Tiempo máquina",
  "Total",
];

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `leerCosteo()` + `leerTarifas()`. El título y el botón de descarga son
 * estáticos; el subtítulo (depende del detalle) y ambas visualizaciones
 * (`CostoTabla`, `CostoHeatmap`) se marcan como skeleton.
 */
export default function CargandoDetalleCosteo() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/costeo" label="Volver a Costeo" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Costeo</h1>
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-border text-text-muted border-b text-xs uppercase">
            <tr>
              {COLUMNAS.map((columna) => (
                <th key={columna} scope="col" className="px-4 py-3">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTableRow key={i} columnas={COLUMNAS.length} />
            ))}
          </tbody>
        </table>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-navy text-base font-semibold">
          Costo por combinación
        </h2>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
