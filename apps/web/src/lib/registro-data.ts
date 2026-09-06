import "server-only";

import path from "node:path";
import { REGISTROS_DIR } from "@/lib/fs-data";
import { pyDelete, pyGet, pyPut } from "@/lib/py-api";
import type {
  CeldaRegistro,
  GuardarRegistroPayload,
  RegistroDetalle,
} from "@/lib/registro-schema";

/** Nombre de archivo tal como lo entrega crear una suite CON SVG cargado
 * (issue #3, todavía local -- ver `escribirYGenerar` en `generar-suite.ts`)
 * -- nunca una ruta con segmentos (`/`, `..`), para que no pueda escaparse
 * de data/registros. */
function nombreDescargableValido(nombre: string): boolean {
  return (
    /^[A-Za-z0-9._-]+\.(csv|gcode)$/.test(nombre) && !nombre.includes("..")
  );
}

/** Ruta absoluta de un archivo descargable si (y solo si) es válido y vive
 * dentro de data/registros/. Todo lo demás (Suites/Registros/Final Run
 * reales) descarga vía Storage (`/api/descargas/gcode`, #51) -- esto solo
 * sigue en pie para el camino local de crear una suite con SVG. */
export function rutaDescarga(archivo: string): string | null {
  if (!nombreDescargableValido(archivo)) return null;
  return path.join(REGISTROS_DIR, archivo);
}

export interface ResumenRegistro {
  corridaId: string;
  /** "suite" (barrido) o "finalRun" (E, #64) -- Hoja de Registro usa esto
   * para no ofrecer "Eliminar corrida" en una ejecución de Final Run (se
   * elimina en grupo completo, desde Final Run). */
  origen: "suite" | "finalRun";
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
