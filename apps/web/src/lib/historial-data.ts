import "server-only";

import { pyGet } from "@/lib/py-api";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";

/**
 * Panorama de alto nivel por familia de material (D reestructurado, issue
 * #12) — espejo de `lectura.panorama_familias()` en `apps/api`. Reemplaza
 * el listado crudo de corridas que tenía antes: para el detalle de una
 * corrida puntual está Hoja de Registro/Costeo; para el detalle por
 * material+espesor+operación con series de tiempo y export, Reportes (#13).
 *
 * Siempre trae las 4 familias, incluso sin ningún dato todavía — los
 * campos de rango/promedio llegan como `""` cuando no hay nada que
 * calcular (nunca un 0 inventado, ver `_costo_str` del lado de Python).
 */
export interface PanoramaFamilia {
  familia: FamiliaMaterial;
  materialesDistintos: number;
  corridas: number;
  pruebasEvaluadas: number;
  pruebasCosteadas: number;
  kwhPorUnidadMin: string;
  kwhPorUnidadMax: string;
  costoPorCeldaMin: string;
  costoPorCeldaMax: string;
  costoPorCeldaPromedio: string;
}

export async function listarPanoramaFamilias(): Promise<PanoramaFamilia[]> {
  return pyGet<PanoramaFamilia[]>("dashboard/familias");
}
