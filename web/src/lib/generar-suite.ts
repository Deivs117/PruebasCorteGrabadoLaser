import "server-only";

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { CONFIGS_DIR, REPO_ROOT } from "@/lib/fs-data";
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
  error?: string;
}

/** Mismo criterio que `esYamlDeSuite` en fs-data.ts: nunca tocar
 * tarifas.yaml ni nada fuera de configs/. */
function nombreDeSuiteValido(nombre: string): boolean {
  return (
    nombre.endsWith(".yaml") &&
    !nombre.includes("tarifas") &&
    !nombre.includes("example") &&
    !nombre.includes("/") &&
    !nombre.includes("..")
  );
}

function nombreArchivoConfig(datos: SuiteFormData): string {
  const marca = Date.now().toString(36);
  return `web-${slug(datos.material)}-${datos.espesorMm}mm-${datos.operacion}-${marca}.yaml`;
}

function construirYaml(datos: SuiteFormData): string {
  return stringifyYaml({
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
  });
}

/**
 * Escribe el YAML en `nombreConfig` y corre el comando real del taller
 * (`uv run laser-toolkit generate-cut/generate-engrave`) sobre ese archivo.
 * Nunca inventa el resultado: si el CLI falla, se devuelve su error tal cual.
 * Compartido entre crear una suite nueva y guardar cambios sobre una ya
 * existente — regenerar el G-code es la misma operación en los dos casos.
 */
async function escribirYGenerar(
  nombreConfig: string,
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  const rutaConfig = path.join(CONFIGS_DIR, nombreConfig);
  await writeFile(rutaConfig, construirYaml(datos), "utf-8");

  const comando =
    datos.operacion === "corte" ? "generate-cut" : "generate-engrave";

  try {
    const { stdout } = await execFileAsync(
      "uv",
      ["run", "laser-toolkit", comando, rutaConfig],
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

export async function generarSuite(
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  return escribirYGenerar(nombreArchivoConfig(datos), datos);
}

/** Guarda los cambios sobre el mismo archivo de configuración (no crea uno
 * nuevo) y regenera su G-code — editar una suite implica que la máquina
 * corra la versión actualizada, no solo cambiar un número en un formulario. */
export async function actualizarSuite(
  archivoExistente: string,
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  if (!nombreDeSuiteValido(archivoExistente)) {
    return { ok: false, error: "Archivo inválido." };
  }
  return escribirYGenerar(archivoExistente, datos);
}

/** Lee una suite ya existente en la forma que espera el formulario del
 * asistente, para poder editarla — separado de `leerSuite` en fs-data.ts,
 * que devuelve la forma pensada para mostrarla en las listas. */
export async function leerSuiteEditable(
  archivo: string,
): Promise<SuiteFormData | null> {
  if (!nombreDeSuiteValido(archivo)) return null;
  try {
    const contenido = await readFile(path.join(CONFIGS_DIR, archivo), "utf-8");
    const datos = parseYaml(contenido) as Record<string, unknown>;

    if (
      typeof datos.material !== "string" ||
      typeof datos.espesor_mm !== "number" ||
      typeof datos.velocidad_mm_min === "number" // Final Run: no la edita este asistente.
    ) {
      return null;
    }

    return {
      operacion: datos.operacion === "grabado" ? "grabado" : "corte",
      material: datos.material,
      espesorMm: datos.espesor_mm,
      lote: typeof datos.lote === "string" ? datos.lote : "L01",
      velocidadesMmMin: Array.isArray(datos.velocidades_mm_min)
        ? (datos.velocidades_mm_min as number[])
        : [],
      potenciasPct: Array.isArray(datos.potencias_pct)
        ? (datos.potencias_pct as number[])
        : [],
      pasadas: typeof datos.pasadas === "number" ? datos.pasadas : 1,
      tamanoCeldaMm:
        typeof datos.tamano_celda_mm === "number" ? datos.tamano_celda_mm : 15,
      espaciadoMm:
        typeof datos.espaciado_mm === "number" ? datos.espaciado_mm : 5,
    };
  } catch {
    return null;
  }
}
