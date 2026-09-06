import "server-only";

import { pyDelete, pyGet, pyPost } from "@/lib/py-api";
import type { ConversionSvgData } from "@/lib/svg-schema";

const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024;

export interface SvgConContenido {
  nombre: string;
  contenido: string;
  subidoEn: string;
}

/**
 * Biblioteca de SVGs de "Grabado Vectorial" (#3) -- vía el servicio Python
 * de #47/#48 (bucket `svg` de Supabase Storage, prefijo `biblioteca/`).
 * Antes escribía en `data/svgs/` (filesystem local): no sobrevivía en la
 * función serverless de Vercel -- cada invocación puede arrancar con un
 * filesystem distinto, así que un SVG subido en una invocación y leído en
 * otra terminaba en `ENOENT`, el bug real que se vio en producción.
 */
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
  try {
    return await pyPost<{ ok: true; nombre: string; contenido: string }>(
      "svgs",
      { nombre: archivo.name, contenido },
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "No se pudo guardar el SVG.",
    };
  }
}

/** Lista + contenido de cada SVG guardado -- lo reutilizan la galería de
 * Grabado Vectorial y el selector de geometría del asistente de Suites. */
export async function listarSvgsConContenido(): Promise<SvgConContenido[]> {
  try {
    return await pyGet<SvgConContenido[]>("svgs");
  } catch {
    return [];
  }
}

export async function eliminarSvg(nombre: string): Promise<boolean> {
  try {
    const resultado = await pyDelete<{ ok: boolean }>(
      `svgs/${encodeURIComponent(nombre)}`,
    );
    return resultado.ok;
  } catch {
    return false;
  }
}

export interface ResultadoConversion {
  ok: boolean;
  gcode?: string;
  error?: string;
}

/**
 * Convierte un SVG ya guardado en la biblioteca a G-code -- reemplaza
 * `execFile("uv", ["run", ..., "svg-to-gcode", ...])` (el hallazgo de #47:
 * ese subproceso tampoco sobrevive en Vercel, sin binario `uv` disponible)
 * por una llamada al servicio Python, mismo patrón que el resto de
 * `apps/api`. El G-code se devuelve inline (una conversión vectorial suelta
 * es texto chico, a diferencia del export combinado del editor, #3/#16) --
 * no hace falta persistir un archivo aparte para descargarlo después.
 */
export async function convertirSvg(
  nombre: string,
  parametros: ConversionSvgData,
): Promise<ResultadoConversion> {
  try {
    const resultado = await pyPost<{ ok: true; gcode: string }>(
      `svgs/${encodeURIComponent(nombre)}/convertir`,
      parametros,
    );
    return { ok: true, gcode: resultado.gcode };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "No se pudo convertir el SVG.",
    };
  }
}
