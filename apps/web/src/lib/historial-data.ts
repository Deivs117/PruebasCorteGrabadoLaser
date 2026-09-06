import "server-only";

import { pyGet } from "@/lib/py-api";

/**
 * Vista agregada de solo lectura (D, issue #63) -- espejo de
 * `lectura.historial()` en `apps/api`. Misma fuente de datos que Hoja de
 * Registro/Costeo (C): solo corridas de Suite (barrido), Final Run (E)
 * todavía no tiene fila en `registros`. Historial nunca escribe nada --
 * para editar/completar/costear una corrida se va a Hoja de Registro/Costeo.
 */
export interface CorridaHistorial {
  corridaId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  lote: string;
  fecha: string;
  totalCeldas: number;
  celdasEvaluadas: number;
  evaluada: boolean;
  medida: boolean;
  costeado: boolean;
  /** Suma de `costoTotalCelda` de toda la corrida, o "" si falta costear
   * alguna celda (nunca subestima ocultando un pendiente). */
  costoTotalCorrida: string;
}

export async function listarHistorial(): Promise<CorridaHistorial[]> {
  return pyGet<CorridaHistorial[]>("historial");
}
