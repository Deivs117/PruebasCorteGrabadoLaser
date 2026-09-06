import "server-only";

import { pyDelete, pyGet, pyPost } from "@/lib/py-api";
import type { FinalRunFormData } from "@/lib/final-run-schema";

/** Solo los campos que administra el formulario, en snake_case -- ya
 * compatible 1:1 con `FinalRunConfig` del lado Python (mismo criterio que
 * `camposConocidos` en `generar-suite.ts`).
 *
 * `id_prefijo` va fijo en "F" (el default de `FinalRunConfig`, no el de
 * `SuiteConfig`) -- Hoja de Registro ahora muestra corridas de Suite y de
 * Final Run mezcladas, así que "F-001" vs "C-001"/"G-001" es lo único que
 * deja distinguir de un vistazo una celda de calibración de una de barrido. */
function camposConocidos(datos: FinalRunFormData): Record<string, unknown> {
  return {
    material: datos.material,
    espesor_mm: datos.espesorMm,
    operacion: datos.operacion,
    velocidad_mm_min: datos.velocidadMmMin,
    potencia_pct: datos.potenciaPct,
    pasadas: datos.pasadas,
    repeticiones: datos.repeticiones,
    tamano_celda_mm: datos.tamanoCeldaMm,
    espaciado_mm: datos.espaciadoMm,
    id_prefijo: "F",
    lote: datos.lote,
  };
}

export interface ResultadoFinalRun {
  ok: boolean;
  grupoId?: string;
  corridaId?: string;
  ejecucion?: number;
  celdas?: number;
  error?: string;
}

function mensajeDeError(error: unknown, generico: string): string {
  return error instanceof Error ? error.message : generico;
}

/** Genera el G-code real de la primera ejecución (o de la siguiente libre,
 * si el grupo ya existía -- ver el docstring de `crear_ejecucion` en
 * Python) y persiste GrupoCalibracion/FinalRun/Registro/Mediciones en la
 * misma operación. Reemplaza `generarFinalRun` + `execFile("uv", ...)`. */
export async function crearEjecucion(
  datos: FinalRunFormData,
): Promise<ResultadoFinalRun> {
  try {
    const resultado = await pyPost<{
      grupoId: string;
      corridaId: string;
      ejecucion: number;
      celdas: number;
    }>("grupos-calibracion", camposConocidos(datos));
    return { ok: true, ...resultado };
  } catch (error) {
    return {
      ok: false,
      error: mensajeDeError(
        error,
        "Error desconocido al generar la ejecución.",
      ),
    };
  }
}

/** Repite exactamente los mismos parámetros de la última ejecución del
 * grupo -- no hace falta volver a elegir nada, por eso no manda ningún
 * cuerpo. */
export async function generarSiguienteEjecucion(
  grupoId: string,
): Promise<ResultadoFinalRun> {
  try {
    const resultado = await pyPost<{
      corridaId: string;
      ejecucion: number;
      celdas: number;
    }>(`grupos-calibracion/${encodeURIComponent(grupoId)}/ejecucion`, {});
    return { ok: true, grupoId, ...resultado };
  } catch (error) {
    return {
      ok: false,
      error: mensajeDeError(error, "No se pudo generar la ejecución."),
    };
  }
}

export interface EjecucionFinalRun {
  ejecucion: number;
  corridaId: string;
  calibrada: boolean;
}

export type EstadoFicha = "oficial" | "en_revision";

export interface GrupoCalibracion {
  grupoId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  velocidadMmMin: string;
  potenciaPct: string;
  repeticiones: number;
  ejecuciones: EjecucionFinalRun[];
  fichaEstado: EstadoFicha | null;
}

/** Espejo de `lectura.grupos_calibracion()` en `apps/api`. */
export async function listarGruposCalibracion(): Promise<GrupoCalibracion[]> {
  return pyGet<GrupoCalibracion[]>("grupos-calibracion");
}

export interface ResultadoResumen {
  ok: boolean;
  nEjecuciones?: number;
  kwhPorUnidadMedio?: number;
  kwhPorUnidadDesvStd?: number;
  kwhPorUnidadCvPct?: number;
  tiempoPorUnidadMedio?: number;
  tiempoPorUnidadDesvStd?: number;
  tiempoPorUnidadCvPct?: number;
  calibrado?: boolean;
  error?: string;
}

/** Reusa `resumen_calibracion_de_grupo` (Python, `laser_toolkit.calibracion`
 * de siempre) en vez de correr `summarize-final-run` como subproceso. */
export async function resumirCalibracion(
  grupoId: string,
  minimoEjecuciones: number,
): Promise<ResultadoResumen> {
  try {
    const resultado = await pyGet<Omit<ResultadoResumen, "ok" | "error">>(
      `grupos-calibracion/${encodeURIComponent(grupoId)}/resumen?minimoEjecuciones=${minimoEjecuciones}`,
    );
    return { ok: true, ...resultado };
  } catch (error) {
    return {
      ok: false,
      error: mensajeDeError(error, "No se pudo resumir la calibración."),
    };
  }
}

export interface ResultadoFicha {
  ok: boolean;
  error?: string;
}

/** Marca (o revierte) la Ficha de Parámetro Estándar de un grupo (F6, issue
 * #7) -- crea o actualiza, nunca duplica (ver `crear_o_actualizar_ficha`). */
export async function actualizarFichaGrupo(
  grupoId: string,
  estado: EstadoFicha,
  notas?: string,
): Promise<ResultadoFicha> {
  try {
    await pyPost(`grupos-calibracion/${encodeURIComponent(grupoId)}/ficha`, {
      estado,
      notas,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: mensajeDeError(error, "No se pudo actualizar la ficha."),
    };
  }
}

/** Borra todas las ejecuciones del grupo (Registro/Mediciones/Candidatos,
 * fotos y `.gcode` en Storage) más su Ficha de Parámetro, y el grupo mismo. */
export async function eliminarGrupoCalibracion(
  grupoId: string,
): Promise<boolean> {
  try {
    await pyDelete(`grupos-calibracion/${encodeURIComponent(grupoId)}`);
    return true;
  } catch {
    return false;
  }
}
