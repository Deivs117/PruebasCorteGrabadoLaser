import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { EstadoFicha } from "@/lib/final-run-data";

export interface FichaDocumentoProps {
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  velocidadMmMin: string;
  potenciaPct: string;
  grupoId: string;
  estado: EstadoFicha;
  /** String vacío = "sin definir todavía" (no distingue "0" de "vacío" a
   * propósito -- un costo real nunca es 0). */
  costoEstandarTotal: string;
  fechaValidacion: string;
  notas: string;
}

/**
 * La "receta" oficial en sí: parámetros + origen + costo + estado. Un solo
 * componente para dos usos (issue #7):
 * - Detalle real de una Ficha ya guardada (`/fichas/[grupoId]`), donde
 *   también hace de superficie imprimible (`data-ficha-imprimible`, ver
 *   `ExportarPdfButton` y las reglas `@media print` de `globals.css`).
 * - Vista previa en vivo del formulario "Nueva Ficha" (Prompt 12: "preview
 *   en Markdown renderizado a la derecha") -- acá se optó por previsualizar
 *   el documento real en vez de agregar una dependencia de Markdown solo
 *   para esto.
 */
export function FichaDocumento({
  material,
  espesorMm,
  operacion,
  velocidadMmMin,
  potenciaPct,
  grupoId,
  estado,
  costoEstandarTotal,
  fechaValidacion,
  notas,
}: FichaDocumentoProps) {
  return (
    <Card
      data-ficha-imprimible
      accent={operacion === "corte" ? "blue" : "purple"}
      className="flex flex-col gap-5 p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-navy text-lg font-semibold">{material}</p>
          <p className="text-text-muted text-sm capitalize">
            {operacion} · {espesorMm}mm
          </p>
        </div>
        <Badge tone={estado === "oficial" ? "ok" : "pendiente"}>
          {estado === "oficial" ? "Oficial" : "En revisión"}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-text-muted">Velocidad oficial</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {velocidadMmMin} mm/min
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Potencia oficial</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {potenciaPct}%
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Costo estándar</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {costoEstandarTotal ? costoEstandarTotal : "Sin definir"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Fecha de validación</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {fechaValidacion ? fechaValidacion : "Sin definir"}
          </dd>
        </div>
      </dl>

      <div className="border-border border-t pt-3 text-sm">
        <p className="text-text-muted">
          Origen: grupo de calibración{" "}
          <Link
            href={`/final-run#${encodeURIComponent(grupoId)}`}
            className="text-blue hover:text-blue-hover font-mono transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
          >
            {grupoId}
          </Link>
        </p>
      </div>

      {notas ? (
        <div className="border-border border-t pt-3 text-sm">
          <p className="text-text-muted mb-1">Notas</p>
          <p className="text-navy whitespace-pre-wrap">{notas}</p>
        </div>
      ) : null}
    </Card>
  );
}
