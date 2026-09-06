import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { REGISTROS_DIR } from "@/lib/fs-data";
import { pyDelete, pyGet, pyPut } from "@/lib/py-api";
import type {
  CeldaRegistro,
  FilaRegistro,
  GuardarRegistroPayload,
  RegistroDetalle,
} from "@/lib/registro-schema";

/** Nombre de archivo tal como lo entrega Final Run (E, todavía 100% csv) —
 * nunca una ruta con segmentos (`/`, `..`), para que no pueda escaparse de
 * data/registros. */
function nombreDescargableValido(nombre: string): boolean {
  return (
    /^[A-Za-z0-9._-]+\.(csv|gcode)$/.test(nombre) && !nombre.includes("..")
  );
}

/** Ruta absoluta de un archivo descargable de Final Run si (y solo si) es
 * válido y vive dentro de data/registros/ -- Hoja de Registro/Costeo (C) ya
 * no generan estos archivos, descargan G-code vía Storage
 * (`/api/descargas/gcode`, #51). */
export function rutaDescarga(archivo: string): string | null {
  if (!nombreDescargableValido(archivo)) return null;
  return path.join(REGISTROS_DIR, archivo);
}

/** Lee cualquier csv con encabezado como lista de filas de texto -- sigue
 * siendo el mecanismo real de Final Run (E, `final-run-data.ts`), que todavía
 * no migró a Supabase. Hoja de Registro/Costeo (C) ya no la usan: sus
 * corridas viven en `registros`/`mediciones`, vía el servicio Python. */
export async function leerFilasCsv<T = FilaRegistro>(
  rutaAbsoluta: string,
): Promise<T[]> {
  const contenido = await readFile(rutaAbsoluta, "utf-8");
  return parseCsv(contenido, { columns: true, skip_empty_lines: true });
}

export interface ResumenRegistro {
  corridaId: string;
  material: string;
  espesorMm: string;
  operacion: string;
  lote: string;
  totalCeldas: number;
  celdasEvaluadas: number;
  costeado: boolean;
  creadoEn: string;
}

/** Espejo de `lectura.registros()` en `apps/api`. Sin la distinción
 * "generadas vs preparadas" del csv viejo: una suite creada (#56) ya nace
 * con su Registro y sus Mediciones completas (hallazgo del plan reordenado
 * de #2), así que solo hay un tipo de fila acá. */
export async function listarRegistros(): Promise<ResumenRegistro[]> {
  return pyGet<ResumenRegistro[]>("registros");
}

export async function leerRegistro(
  corridaId: string,
): Promise<RegistroDetalle | null> {
  try {
    return await pyGet<RegistroDetalle>(
      `registros/${encodeURIComponent(corridaId)}`,
    );
  } catch {
    return null;
  }
}

export interface ResultadoGuardarRegistro {
  ok: boolean;
  celdas?: CeldaRegistro[];
  error?: string;
}

export async function guardarRegistro(
  corridaId: string,
  datos: GuardarRegistroPayload,
): Promise<ResultadoGuardarRegistro> {
  try {
    const detalle = await pyPut<RegistroDetalle>(
      `registros/${encodeURIComponent(corridaId)}`,
      datos,
    );
    return { ok: true, celdas: detalle.celdas };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar el registro.",
    };
  }
}

/** Borra la corrida completa: en el modelo normalizado eso implica borrar
 * también su Suite (ver el docstring de `eliminar_registro_por_corrida` en
 * Python) -- no hay forma hoy de regenerar el G-code de una Suite existente
 * sin volver a crearla entera. */
export async function eliminarCorrida(corridaId: string): Promise<boolean> {
  try {
    await pyDelete(`registros/${encodeURIComponent(corridaId)}`);
    return true;
  } catch {
    return false;
  }
}
