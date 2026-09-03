import "server-only";

import { execFile } from "node:child_process";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";
import { FOTOS_DIR, REGISTROS_DIR, REPO_ROOT } from "@/lib/fs-data";
import { slug } from "@/lib/slug";
import { COLUMNAS_REGISTRO, type FilaRegistro } from "@/lib/registro-schema";
import { desmarcarCandidatosDeArchivo } from "@/lib/candidatos-final-run";

const execFileAsync = promisify(execFile);

export interface CorridaGenerada {
  archivo: string;
  corridaId: string;
}

/** Nombre de archivo tal como lo entrega el listado — nunca una ruta con
 * segmentos (`/`, `..`), para que no pueda escaparse de data/registros. */
function nombreDeArchivoValido(nombre: string): boolean {
  return /^[A-Za-z0-9._-]+\.csv$/.test(nombre) && !nombre.includes("..");
}

/** Igual que arriba, pero acepta también `.gcode` — para descargar el
 * archivo tal cual quedó en el sistema, no solo leer el csv. */
function nombreDescargableValido(nombre: string): boolean {
  return (
    /^[A-Za-z0-9._-]+\.(csv|gcode)$/.test(nombre) && !nombre.includes("..")
  );
}

function filaEvaluada(fila: FilaRegistro): boolean {
  return (
    fila.corte_pasante !== "" &&
    fila.calidad_borde_1a5 !== "" &&
    fila.carbonizacion_1a5 !== ""
  );
}

/** Lee cualquier csv con encabezado como lista de filas de texto — lo
 * reutiliza Costeo para leer un `_costeado.csv`, que tiene más columnas
 * que `FilaRegistro` pero el mismo formato. */
export async function leerFilasCsv<T = FilaRegistro>(
  rutaAbsoluta: string,
): Promise<T[]> {
  const contenido = await readFile(rutaAbsoluta, "utf-8");
  return parseCsv(contenido, { columns: true, skip_empty_lines: true });
}

async function leerFilas(rutaAbsoluta: string): Promise<FilaRegistro[]> {
  return leerFilasCsv<FilaRegistro>(rutaAbsoluta);
}

export interface ResumenRegistro {
  corridaId: string;
  material: string;
  espesorMm: string;
  operacion: string;
  totalCeldas: number;
  celdasEvaluadas: number;
}

export type CorridaPreparada = ResumenRegistro & { archivo: string };

/** Datos básicos de un `_registro.csv` ya preparado — usado por Hoja de
 * Registro y por Costeo, para no leer/interpretar el csv dos veces. */
export async function resumenRegistro(
  archivo: string,
): Promise<ResumenRegistro | null> {
  try {
    const filas = await leerFilas(path.join(REGISTROS_DIR, archivo));
    const primera = filas[0];
    if (!primera) return null;
    return {
      corridaId: primera.corrida_id,
      material: primera.material,
      espesorMm: primera.espesor_mm,
      operacion: primera.operacion,
      totalCeldas: filas.length,
      celdasEvaluadas: filas.filter(filaEvaluada).length,
    };
  } catch {
    return null;
  }
}

/** Corridas separadas en dos grupos: generadas (falta correr `prepare-record`)
 * y preparadas (ya tienen su Hoja de Registro, con progreso real). */
export async function listarCorridas(): Promise<{
  generadas: CorridaGenerada[];
  preparadas: CorridaPreparada[];
}> {
  let archivos: string[];
  try {
    archivos = (await readdir(REGISTROS_DIR)).filter((n) => n.endsWith(".csv"));
  } catch {
    return { generadas: [], preparadas: [] };
  }

  const preparadosSet = new Set(
    archivos.filter((n) => n.includes("_registro")),
  );
  const generados = archivos.filter(
    (n) =>
      !n.includes("_registro") &&
      !preparadosSet.has(`${n.replace(/\.csv$/, "")}_registro.csv`),
  );

  const generadas: CorridaGenerada[] = generados.map((archivo) => ({
    archivo,
    corridaId: archivo.replace(/\.csv$/, ""),
  }));

  const preparadas: CorridaPreparada[] = [];
  for (const archivo of preparadosSet) {
    const resumen = await resumenRegistro(archivo);
    if (resumen) preparadas.push({ archivo, ...resumen });
  }

  return { generadas, preparadas };
}

export async function leerRegistro(
  archivo: string,
): Promise<FilaRegistro[] | null> {
  if (!nombreDeArchivoValido(archivo) || !archivo.includes("_registro"))
    return null;
  try {
    return await leerFilas(path.join(REGISTROS_DIR, archivo));
  } catch {
    return null;
  }
}

export async function guardarRegistro(
  archivo: string,
  filas: FilaRegistro[],
): Promise<boolean> {
  if (!nombreDeArchivoValido(archivo) || !archivo.includes("_registro"))
    return false;
  const csv = stringifyCsv(filas, { header: true, columns: COLUMNAS_REGISTRO });
  await writeFile(path.join(REGISTROS_DIR, archivo), csv, "utf-8");
  return true;
}

/** Ruta absoluta de un archivo descargable si (y solo si) es válido y
 * vive dentro de data/registros/ — usado por la ruta de descarga. */
export function rutaDescarga(archivo: string): string | null {
  if (!nombreDescargableValido(archivo)) return null;
  return path.join(REGISTROS_DIR, archivo);
}

/** Borra los tres archivos que puede tener una corrida (G-code, csv
 * generado, csv de registro) y las fotos que le subieron — CRUD real, no
 * un botón decorativo. Nunca falla si alguno ya no existe. */
export async function eliminarCorrida(corridaId: string): Promise<boolean> {
  if (/[\\/]|\.\./.test(corridaId) || corridaId.trim() === "") return false;

  const posibles = [
    `${corridaId}.gcode`,
    `${corridaId}.csv`,
    `${corridaId}_registro.csv`,
  ];
  await Promise.all(
    posibles.map((nombre) =>
      unlink(path.join(REGISTROS_DIR, nombre)).catch(() => undefined),
    ),
  );

  try {
    const prefijo = `${slug(corridaId)}_`;
    const fotos = (await readdir(FOTOS_DIR)).filter((n) =>
      n.startsWith(prefijo),
    );
    await Promise.all(
      fotos.map((n) => unlink(path.join(FOTOS_DIR, n)).catch(() => undefined)),
    );
  } catch {
    // sin fotos o carpeta inexistente: no es un error.
  }

  await desmarcarCandidatosDeArchivo(`${corridaId}_registro.csv`);

  return true;
}

export interface ResultadoPreparar {
  ok: boolean;
  archivoRegistro?: string;
  error?: string;
}

/** Corre `uv run laser-toolkit prepare-record <csv>` — el mismo comando que
 * usaría el técnico a mano, no una reimplementación en JS. */
export async function prepararRegistro(
  archivo: string,
): Promise<ResultadoPreparar> {
  if (!nombreDeArchivoValido(archivo) || archivo.includes("_registro")) {
    return { ok: false, error: "Archivo inválido." };
  }

  const rutaCsv = path.join(REGISTROS_DIR, archivo);
  try {
    const { stdout } = await execFileAsync(
      "uv",
      ["run", "laser-toolkit", "prepare-record", rutaCsv],
      { cwd: REPO_ROOT, timeout: 30_000 },
    );
    const ruta = stdout.match(/Registro preparado: (\S+)/)?.[1];
    if (!ruta) {
      return {
        ok: false,
        error:
          "Se preparó el registro pero no se pudo confirmar el archivo resultante.",
      };
    }
    return { ok: true, archivoRegistro: path.basename(ruta) };
  } catch (error) {
    const mensaje =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : error instanceof Error
          ? error.message
          : "Error desconocido al preparar el registro.";
    return { ok: false, error: mensaje.trim() };
  }
}
