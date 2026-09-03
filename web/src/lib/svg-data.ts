import "server-only";

import { execFile } from "node:child_process";
import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { REPO_ROOT } from "@/lib/fs-data";
import { slug } from "@/lib/slug";
import type { ConversionSvgData } from "@/lib/svg-schema";

const execFileAsync = promisify(execFile);

export const SVGS_DIR = path.join(REPO_ROOT, "data", "svgs");
const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024;

/** Nombre de archivo tal como lo devuelve `guardarSvg` — nunca una ruta con
 * segmentos, para que no pueda escaparse de data/svgs. */
function nombreSvgValido(nombre: string): boolean {
  return /^[a-z0-9-]+\.svg$/.test(nombre);
}

function nombreGcodeDe(nombreSvg: string): string {
  return nombreSvg.replace(/\.svg$/, ".gcode");
}

export interface SvgGuardado {
  nombre: string;
  tamanoBytes: number;
  subidoEn: string;
}

export async function guardarSvg(
  archivo: File,
): Promise<
  { ok: true; nombre: string; contenido: string } | { ok: false; error: string }
> {
  if (!archivo.name.toLowerCase().endsWith(".svg")) {
    return { ok: false, error: "Tiene que ser un archivo .svg." };
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return { ok: false, error: "El archivo pesa más de 4MB." };
  }

  const contenido = await archivo.text();
  const nombreBase = slug(archivo.name.replace(/\.svg$/i, ""));
  const nombre = `${nombreBase}-${Date.now().toString(36)}.svg`;
  await writeFile(path.join(SVGS_DIR, nombre), contenido, "utf-8");
  return { ok: true, nombre, contenido };
}

export async function listarSvgsGuardados(): Promise<SvgGuardado[]> {
  let archivos: string[];
  try {
    archivos = (await readdir(SVGS_DIR)).filter((n) => n.endsWith(".svg"));
  } catch {
    return [];
  }

  const resultado: SvgGuardado[] = [];
  for (const nombre of archivos) {
    try {
      const info = await stat(path.join(SVGS_DIR, nombre));
      resultado.push({
        nombre,
        tamanoBytes: info.size,
        subidoEn: (info.birthtimeMs > 0
          ? info.birthtime
          : info.mtime
        ).toISOString(),
      });
    } catch {
      // archivo borrado justo entre el readdir y el stat: se omite.
    }
  }
  resultado.sort((a, b) => b.subidoEn.localeCompare(a.subidoEn));
  return resultado;
}

export async function leerSvgTexto(nombre: string): Promise<string | null> {
  if (!nombreSvgValido(nombre)) return null;
  try {
    return await readFile(path.join(SVGS_DIR, nombre), "utf-8");
  } catch {
    return null;
  }
}

export async function eliminarSvg(nombre: string): Promise<boolean> {
  if (!nombreSvgValido(nombre)) return false;
  try {
    await unlink(path.join(SVGS_DIR, nombre));
    await unlink(path.join(SVGS_DIR, nombreGcodeDe(nombre))).catch(
      () => undefined,
    );
    return true;
  } catch {
    return false;
  }
}

export interface ResultadoConversion {
  ok: boolean;
  gcode?: string;
  archivoGcode?: string;
  error?: string;
}

const PATRON_RESULTADO = /G-code generado: (\S+) \((\d+) lineas, modo (\S+)\)/;
// `rich` (el formateador de tracebacks de Typer) le hace word-wrap al
// mensaje de la excepción cuando la salida no es una terminal interactiva
// -- por eso captura hasta el final y no solo la primera línea, y junta los
// saltos de línea de vuelta en un solo espacio.
const PATRON_ERROR_PYTHON = /ValueError: ([\s\S]+)/;

/**
 * Corre `uv run laser-toolkit svg-to-gcode` tal cual — el parser de SVG, el
 * aplanado de curvas y el relleno vectorial viven únicamente en Python
 * (laser_toolkit.svg). El resultado queda guardado en data/svgs/ (mismo
 * nombre base que el SVG, con extensión .gcode) y además se devuelve su
 * contenido para dibujar la vista previa en el navegador.
 */
export async function convertirSvg(
  nombre: string,
  parametros: ConversionSvgData,
): Promise<ResultadoConversion> {
  if (!nombreSvgValido(nombre)) {
    return { ok: false, error: "Archivo inválido." };
  }

  const rutaSvg = path.join(SVGS_DIR, nombre);
  const nombreGcode = nombreGcodeDe(nombre);
  const rutaGcode = path.join(SVGS_DIR, nombreGcode);

  try {
    const { stdout } = await execFileAsync(
      "uv",
      [
        "run",
        "laser-toolkit",
        "svg-to-gcode",
        rutaSvg,
        "--ancho-mm",
        String(parametros.anchoMm),
        "--alto-mm",
        String(parametros.altoMm),
        "--velocidad",
        String(parametros.velocidadMmMin),
        "--potencia",
        String(parametros.potenciaPct),
        "--modo",
        parametros.modo,
        "--resolucion-relleno-mm",
        String(parametros.resolucionRellenoMm),
        "--salida",
        rutaGcode,
      ],
      { cwd: REPO_ROOT, timeout: 30_000 },
    );

    if (!PATRON_RESULTADO.test(stdout)) {
      return {
        ok: false,
        error: "Se generó el G-code pero no se pudo confirmar el resultado.",
      };
    }

    const gcode = await readFile(rutaGcode, "utf-8");
    return { ok: true, gcode, archivoGcode: nombreGcode };
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : "";
    const mensajePython = stderr
      .match(PATRON_ERROR_PYTHON)?.[1]
      ?.trim()
      .replace(/\s+/g, " ");
    const mensaje =
      mensajePython ??
      (error instanceof Error
        ? error.message
        : "Error desconocido al convertir el SVG.");
    return { ok: false, error: mensaje.trim() };
  }
}

/** Ruta absoluta de un `.gcode` ya generado, si existe — usado por la ruta
 * de descarga. Recibe el nombre real del archivo (no el del SVG), para que
 * el navegador sugiera guardarlo con la extensión correcta. */
export function rutaGcodeDescarga(nombreGcode: string): string | null {
  if (!/^[a-z0-9-]+\.gcode$/.test(nombreGcode)) return null;
  return path.join(SVGS_DIR, nombreGcode);
}
