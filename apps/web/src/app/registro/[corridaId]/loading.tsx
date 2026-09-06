import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";

const COLUMNAS = ["Prueba", "Corte pasante", "Carbonización", "Foto", "Notas"];

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `leerRegistro()` + `listarCandidatos()`. La `corridaId` ya se conoce por
 * la URL, pero el detalle real (material, celdas, cuántas hay) todavía no —
 * el subtítulo y la tabla se marcan como skeleton; el resto del layout
 * (título, encabezados de tabla, labels) es estático y se repite tal cual.
 */
export default function CargandoDetalleRegistro() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/registro" label="Volver a Hoja de Registro" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Celdas evaluadas</span>
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-navy text-sm font-medium">Pasadas</span>
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-navy text-sm font-medium">
              Foto de toda la batería
            </span>
            <Skeleton className="size-12 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-sm">
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
    </div>
  );
}
