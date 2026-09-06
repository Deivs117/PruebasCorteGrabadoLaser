import "server-only";

import { pyGet } from "@/lib/py-api";
import type { EstadoFicha } from "@/lib/final-run-data";

export interface Ficha {
  grupoId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  velocidadMmMin: string;
  potenciaPct: string;
  estado: EstadoFicha;
  costoEstandarTotal: string;
  fechaValidacion: string;
  notas: string;
}

/**
 * Todas las Fichas de Parámetro Estándar que ya existen (F6, issue #7) --
 * a diferencia de `listarGruposCalibracion`, acá solo entran los grupos que
 * ya tienen una Ficha creada (`fichaEstado` distinto de `null`).
 */
export async function listarFichas(): Promise<Ficha[]> {
  return pyGet<Ficha[]>("fichas-parametro");
}
