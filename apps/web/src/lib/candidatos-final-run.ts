import "server-only";

import { pyDelete, pyGet, pyPost } from "@/lib/py-api";

export interface CandidatoFinalRun {
  /** `${corridaId}::${idPrueba}` — identifica una celda concreta de una corrida. */
  id: string;
  corridaId: string;
  idPrueba: string;
  /** El `_registro.csv` de origen, por si hace falta volver a ver esa Hoja de Registro. */
  archivo: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  velocidadMmMin: string;
  potenciaPct: string;
  marcadoEn: string;
}

/**
 * Combinaciones que el técnico marcó como "esta es la que quiero llevar a
 * Final Run" — tabla `candidatos_final_run` en Supabase (issue #22/#24), vía
 * el servicio Python de #47/#48/#49. Antes vivía en su propio
 * `data/candidatos-final-run.json`; ahora es una fila normalizada
 * (`medicion_id`), reconstruida a esta forma plana del lado de Python.
 */
export async function listarCandidatos(): Promise<CandidatoFinalRun[]> {
  return pyGet<CandidatoFinalRun[]>("candidatos");
}

/**
 * Marca una celda como candidata. Solo la identidad (`corridaId`+`idPrueba`)
 * viaja a Python -- el resto de los campos de `datos` (material, espesorMm,
 * ...) los reconstruye Python desde la fila normalizada, así que lo que
 * vuelve es siempre la verdad de la base, no lo que mandó el formulario.
 */
export async function marcarCandidato(
  datos: Omit<CandidatoFinalRun, "marcadoEn">,
): Promise<CandidatoFinalRun> {
  return pyPost<CandidatoFinalRun>("candidatos", {
    corridaId: datos.corridaId,
    idPrueba: datos.idPrueba,
  });
}

export async function desmarcarCandidato(id: string): Promise<void> {
  const [corridaId, idPrueba] = id.split("::");
  const parametros = new URLSearchParams({
    corridaId: corridaId ?? "",
    idPrueba: idPrueba ?? "",
  });
  await pyDelete(`candidatos?${parametros.toString()}`);
}
