import "server-only";

import { listarRegistros, type ResumenRegistro } from "@/lib/registro-data";
import { pyGet, pyPost } from "@/lib/py-api";
import type { CosteoDetalle } from "@/lib/registro-schema";

export type Costeable = ResumenRegistro;

/** Espejo de `listarCosteables` en el csv viejo: mismos registros que Hoja
 * de Registro, `costeado` ya viene calculado por `lectura.registros()`
 * (todas sus celdas con costo total, o ninguna). */
export async function listarCosteables(): Promise<Costeable[]> {
  return listarRegistros();
}

export async function leerCosteo(
  corridaId: string,
): Promise<CosteoDetalle | null> {
  try {
    return await pyGet<CosteoDetalle>(
      `registros/${encodeURIComponent(corridaId)}/costeo`,
    );
  } catch {
    return null;
  }
}

export interface ResultadoCosteo {
  ok: boolean;
  error?: string;
}

/** Reusa `calcular_y_guardar_costos_registro` (Python, `laser_toolkit.costos`
 * de siempre) en vez de correr `compute-costs` como subproceso. */
export async function calcularCosteo(
  corridaId: string,
): Promise<ResultadoCosteo> {
  try {
    await pyPost(`registros/${encodeURIComponent(corridaId)}/costeo`, {});
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo calcular el costeo.",
    };
  }
}
