import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";
import { REGISTROS_DIR, listarSuites } from "@/lib/fs-data";
import { loteSiguiente } from "@/lib/lote-siguiente";

/**
 * Espejo de `nombre_base` en src/laser_toolkit/naming.py — SOLO para
 * predecir si guardar esta suite chocaría con una corrida ya generada
 * (mismo nombre de archivo de salida). Nunca se usa para generar el nombre
 * real: eso lo sigue haciendo el CLI de Python.
 *
 * El asistente nunca expone el campo `fecha` de SuiteConfig (siempre se
 * omite al escribir el YAML), así que el CLI usa la fecha de hoy — esta
 * función asume lo mismo.
 */
export function predecirCorridaId(datos: {
  material: string;
  espesorMm: number;
  operacion: "corte" | "grabado";
  lote: string;
}): string {
  const materialSlug = datos.material.trim().split(/\s+/).join("-");
  const hoy = new Date();
  const fecha = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");
  // Refleja el formato "%g" de Python para los espesores usuales del taller
  // (sin notación científica) — 3 -> "3", 3.5 -> "3.5".
  const espesor = String(datos.espesorMm);
  return `${materialSlug}_${espesor}mm_${datos.operacion}_${fecha}_${datos.lote}`;
}

export async function existeArchivo(ruta: string): Promise<boolean> {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

interface IdentidadSuite {
  material: string;
  espesorMm: number;
  operacion: "corte" | "grabado";
  lote: string;
}

/** Ya hay algo con esta identidad, sea una suite configurada (todavía sin
 * generar) o una corrida ya generada/preparada — cualquiera de las dos
 * bastaría para que "Duplicar" terminara reescribiendo algo real. */
async function loteOcupado(datos: IdentidadSuite): Promise<boolean> {
  const suites = await listarSuites();
  const chocaConConfig = suites.some(
    (s) =>
      s.material.trim() === datos.material.trim() &&
      s.espesorMm === datos.espesorMm &&
      s.operacion === datos.operacion &&
      s.lote === datos.lote,
  );
  if (chocaConConfig) return true;

  const corridaId = predecirCorridaId(datos);
  const nombres = [
    `${corridaId}.csv`,
    `${corridaId}.gcode`,
    `${corridaId}_registro.csv`,
  ];
  for (const nombre of nombres) {
    if (await existeArchivo(path.join(REGISTROS_DIR, nombre))) return true;
  }
  return false;
}

const INTENTOS_MAXIMOS = 200;

/**
 * Sugerencia real de "Duplicar suite": no basta con incrementar el lote de
 * origen una sola vez (L01 -> L02) porque para cuando el técnico duplica por
 * segunda o tercera vez ese lote ya está tomado — el incidente real que
 * motivó esto. Escanea suites configuradas y corridas ya generadas hasta
 * encontrar el primer lote realmente libre para esa identidad.
 */
export async function sugerirLoteLibre(datos: IdentidadSuite): Promise<string> {
  let candidato = loteSiguiente(datos.lote);
  for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
    if (!(await loteOcupado({ ...datos, lote: candidato }))) return candidato;
    candidato = loteSiguiente(candidato);
  }
  return candidato;
}
