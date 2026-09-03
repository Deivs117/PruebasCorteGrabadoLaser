import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT } from "@/lib/fs-data";

const RUTA = path.join(REPO_ROOT, "data", "candidatos-final-run.json");

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
 * Final Run" mientras completaba una Hoja de Registro. No es un dato del
 * motor de costeo/calibración de Python (no describe nada físico medido),
 * es pura conveniencia de la interfaz — por eso vive en su propio archivo,
 * separado del csv real que sí consume el CLI.
 */
async function leerTodos(): Promise<CandidatoFinalRun[]> {
  try {
    const contenido = await readFile(RUTA, "utf-8");
    const datos: unknown = JSON.parse(contenido);
    return Array.isArray(datos) ? (datos as CandidatoFinalRun[]) : [];
  } catch {
    return [];
  }
}

async function guardarTodos(candidatos: CandidatoFinalRun[]): Promise<void> {
  await writeFile(RUTA, JSON.stringify(candidatos, null, 2), "utf-8");
}

export async function listarCandidatos(): Promise<CandidatoFinalRun[]> {
  const candidatos = await leerTodos();
  return candidatos.sort((a, b) => b.marcadoEn.localeCompare(a.marcadoEn));
}

export async function marcarCandidato(
  datos: Omit<CandidatoFinalRun, "marcadoEn">,
): Promise<CandidatoFinalRun> {
  const candidatos = await leerTodos();
  const candidato: CandidatoFinalRun = { ...datos, marcadoEn: new Date().toISOString() };
  const sinDuplicado = candidatos.filter((c) => c.id !== candidato.id);
  await guardarTodos([...sinDuplicado, candidato]);
  return candidato;
}

export async function desmarcarCandidato(id: string): Promise<void> {
  const candidatos = await leerTodos();
  await guardarTodos(candidatos.filter((c) => c.id !== id));
}

/** Al borrar una corrida entera, sus candidatos marcados quedan huérfanos —
 * los quita para no ofrecerlos luego en el selector de Final Run. */
export async function desmarcarCandidatosDeArchivo(archivo: string): Promise<void> {
  const candidatos = await leerTodos();
  await guardarTodos(candidatos.filter((c) => c.archivo !== archivo));
}
