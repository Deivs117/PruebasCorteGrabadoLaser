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
  /** Costo/tiempo por mm cortado o mm² grabado (issue #170), 100%
   * calculado -- string vacío = "todavía sin calibración medida", no se
   * edita a mano. Solo el par que corresponde a `operacion` trae valor. */
  costoPorMm: string;
  tiempoPorMmS: string;
  costoPorMm2: string;
  tiempoPorMm2S: string;
  /** El costo de corte no incluye material porque falta su tarifa. */
  materialCostoPendiente: boolean;
  fechaValidacion: string;
  notas: string;
  /** Notas cargadas celda por celda durante la calibración -- distintas de
   * `notas` (el campo propio de la Ficha, editado a mano). */
  notasOperario: string[];
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
 *   para esto. Antes de guardar todavía no hay costo calculado (issue
 *   #170): la vista previa pasa los 4 campos de costo vacíos y este
 *   componente los muestra como "Se calcula al guardar".
 */
export function FichaDocumento({
  material,
  espesorMm,
  operacion,
  velocidadMmMin,
  potenciaPct,
  grupoId,
  estado,
  costoPorMm,
  tiempoPorMmS,
  costoPorMm2,
  tiempoPorMm2S,
  materialCostoPendiente,
  fechaValidacion,
  notas,
  notasOperario,
}: FichaDocumentoProps) {
  const esCorte = operacion === "corte";
  const costoValor = esCorte ? costoPorMm : costoPorMm2;
  const tiempoValor = esCorte ? tiempoPorMmS : tiempoPorMm2S;
  const etiquetaCosto = esCorte
    ? "Costo por mm cortado"
    : "Costo por mm² grabado";
  const etiquetaTiempo = esCorte
    ? "Tiempo por mm cortado"
    : "Tiempo por mm² grabado";

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
          <dt className="text-text-muted">{etiquetaCosto}</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {costoValor ? costoValor : "Se calcula al guardar"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">{etiquetaTiempo}</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {tiempoValor ? tiempoValor : "Se calcula al guardar"}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Fecha de validación</dt>
          <dd className="text-navy font-mono text-lg font-medium">
            {fechaValidacion ? fechaValidacion : "Sin definir"}
          </dd>
        </div>
      </dl>

      {esCorte && materialCostoPendiente ? (
        <p className="border-orange/30 bg-orange-soft text-navy rounded-[var(--radius-sm)] border p-3 text-sm">
          Costo de material pendiente de tarifa -- el costo de arriba solo
          incluye energía y tiempo de máquina.
        </p>
      ) : null}

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

      {notasOperario.length > 0 ? (
        <div className="border-border border-t pt-3 text-sm">
          <p className="text-text-muted mb-1">
            Notas del operario (calibración)
          </p>
          <ul className="text-navy flex flex-col gap-1">
            {notasOperario.map((nota, i) => (
              <li key={i} className="whitespace-pre-wrap">
                · {nota}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
