import "server-only";

import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { stringify as stringifyYaml } from "yaml";
import { CONFIGS_DIR, PY_PROJECT_ARGS, REPO_ROOT } from "@/lib/fs-data";
import { pyDelete, pyGet, pyPost, pyPut } from "@/lib/py-api";
import { slug } from "@/lib/slug";
import { idPrefijo, type SuiteFormData } from "@/lib/suite-schema";

const execFileAsync = promisify(execFile);

// El CLI Python es la única fuente de verdad para nombrar y generar los
// archivos de salida (ver src/laser_toolkit/naming.py) — este módulo nunca
// reconstruye esa lógica en JS, solo lee lo que el propio comando reporta
// por stdout.
const PATRON_GCODE = /G-code generado: (\S+)/;
const PATRON_CSV = /CSV hermano generado: (\S+) \((\d+) celdas\)/;

export interface ResultadoGeneracion {
  ok: boolean;
  gcodeFileName?: string;
  csvFileName?: string;
  celdas?: number;
  /** Solo en el camino nuevo (Supabase, ver `generarSuite`) -- identifica el
   * `.gcode` en Storage para armar el link de descarga. */
  corridaId?: string;
  error?: string;
}

function nombreArchivoConfig(datos: SuiteFormData): string {
  const marca = Date.now().toString(36);
  return `web-${slug(datos.material)}-${datos.espesorMm}mm-${datos.operacion}-${marca}.yaml`;
}

/** Solo los campos que administra el asistente. Compartido por los tres
 * caminos de escritura: crear/editar una suite real (Supabase, camelCase ->
 * snake_case, ya compatible 1:1 con `SuiteConfig`) y crear una suite con SVG
 * (todavía local, issue #3 -- editar una ya creada con SVG no es un caso
 * real: una suite real de Supabase nunca tiene `svgPath`, ver B/#62). */
function camposConocidos(datos: SuiteFormData): Record<string, unknown> {
  const campos: Record<string, unknown> = {
    material: datos.material,
    espesor_mm: datos.espesorMm,
    operacion: datos.operacion,
    velocidades_mm_min: datos.velocidadesMmMin,
    potencias_pct: datos.potenciasPct,
    pasadas: datos.pasadas,
    tamano_celda_mm: datos.tamanoCeldaMm,
    espaciado_mm: datos.espaciadoMm,
    id_prefijo: idPrefijo(datos.operacion),
    lote: datos.lote,
  };
  if (datos.svgPath) {
    campos.svg_path = datos.svgPath;
    // modo_grabado_svg/svg_resolucion_relleno_mm solo tienen efecto en
    // grabado (corte con SVG siempre traza el contorno, ver suites/cut.py) —
    // no se escriben para corte, para no sugerir una opción que no aplica.
    if (datos.operacion === "grabado") {
      if (datos.modoGrabadoSvg) campos.modo_grabado_svg = datos.modoGrabadoSvg;
      if (datos.svgResolucionRellenoMm !== undefined) {
        campos.svg_resolucion_relleno_mm = datos.svgResolucionRellenoMm;
      }
    }
  }
  return campos;
}

/**
 * Escribe `contenidoYaml` en `nombreConfig` y corre el comando real del
 * taller (`uv run laser-toolkit generate-cut/generate-engrave`) sobre ese
 * archivo. Nunca inventa el resultado: si el CLI falla, se devuelve su
 * error tal cual. Compartido entre crear una suite nueva y guardar cambios
 * sobre una ya existente — regenerar el G-code es la misma operación en
 * los dos casos.
 */
async function escribirYGenerar(
  nombreConfig: string,
  contenidoYaml: Record<string, unknown>,
  operacion: "corte" | "grabado",
): Promise<ResultadoGeneracion> {
  const rutaConfig = path.join(CONFIGS_DIR, nombreConfig);
  await writeFile(rutaConfig, stringifyYaml(contenidoYaml), "utf-8");

  const comando = operacion === "corte" ? "generate-cut" : "generate-engrave";

  try {
    const { stdout } = await execFileAsync(
      "uv",
      ["run", ...PY_PROJECT_ARGS, "laser-toolkit", comando, rutaConfig],
      { cwd: REPO_ROOT, timeout: 30_000 },
    );

    const gcode = stdout.match(PATRON_GCODE)?.[1];
    const csv = stdout.match(PATRON_CSV);
    const csvPath = csv?.[1];
    const csvCeldas = csv?.[2];

    if (!gcode || !csvPath || !csvCeldas) {
      return {
        ok: false,
        error:
          "La suite se generó pero no se pudo confirmar el resultado. Revisá la salida del taller manualmente.",
      };
    }

    return {
      ok: true,
      gcodeFileName: path.basename(gcode),
      csvFileName: path.basename(csvPath),
      celdas: Number(csvCeldas),
    };
  } catch (error) {
    const mensaje =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : error instanceof Error
          ? error.message
          : "Error desconocido al generar la suite.";
    return { ok: false, error: mensaje.trim() };
  }
}

/**
 * Crea una suite nueva -- (A)/#56, vía el servicio Python: persiste
 * Suite+Registro+Mediciones en Supabase y genera el G-code real en la misma
 * operación, sin pasar por un YAML local ni un subproceso (el hallazgo de
 * #47). `camposConocidos()` ya arma el payload en snake_case, compatible
 * 1:1 con `SuiteConfig` del lado Python.
 *
 * Excepción: si la suite usa un SVG cargado (`svgPath`), ese camino todavía
 * no está soportado por el servicio Python (issue #3 -- el SVG vive en
 * `assets/svg/` local, no en Storage) y sigue el camino viejo.
 */
export async function generarSuite(
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  if (datos.svgPath) {
    return escribirYGenerar(
      nombreArchivoConfig(datos),
      camposConocidos(datos),
      datos.operacion,
    );
  }

  try {
    const resultado = await pyPost<{ corridaId: string; celdas: number }>(
      "suites",
      camposConocidos(datos),
    );
    return {
      ok: true,
      celdas: resultado.celdas,
      corridaId: resultado.corridaId,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al generar la suite.",
    };
  }
}

/**
 * Guarda los cambios sobre la misma Suite/Registro (B, issue #62) y
 * regenera su G-code -- editar una suite implica que la máquina corra la
 * versión actualizada, no solo cambiar un número en un formulario. El
 * servicio Python (`creacion.actualizar`) rechaza la edición si el Registro
 * ya tiene evaluación, medición de corrida o costeo cargado (mismo
 * incidente real que motivaba `actualizarSuite`/`corridaYaRegistrada` en el
 * sistema de archivos viejo) -- ese error ya viaja en `resultado.error`
 * tal cual lo devuelve Python, no se reinterpreta acá.
 */
export async function actualizarSuitePorId(
  id: number,
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  try {
    const resultado = await pyPut<{ corridaId: string; celdas: number }>(
      `suites/${id}`,
      camposConocidos(datos),
    );
    return {
      ok: true,
      celdas: resultado.celdas,
      corridaId: resultado.corridaId,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al actualizar la suite.",
    };
  }
}

/** Lee una suite real de Supabase en la forma que espera el asistente --
 * compartida por "Duplicar" (A) y "Editar" (B), ver el docstring de
 * `suite_detalle` en `apps/api/lectura.py`. */
export async function leerSuiteParaFormulario(
  id: number,
): Promise<SuiteFormData | null> {
  try {
    return await pyGet<SuiteFormData>(`suites/${id}`);
  } catch {
    return null;
  }
}

/** Elimina una suite real de Supabase en cascada (Suite→Registro→Mediciones→
 * Candidatos, más el `.gcode`/fotos en Storage) -- (A), issue #54. */
export async function eliminarSuitePorId(id: number): Promise<boolean> {
  try {
    await pyDelete(`suites/${id}`);
    return true;
  } catch {
    return false;
  }
}
