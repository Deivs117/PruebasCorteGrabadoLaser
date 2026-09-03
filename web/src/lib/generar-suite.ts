import "server-only";

import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { stringify as stringifyYaml } from "yaml";
import { CONFIGS_DIR, REPO_ROOT } from "@/lib/fs-data";
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

/** Deja solo [a-z0-9-], para que texto libre del formulario nunca termine
 * siendo parte de una ruta de archivo insegura. */
function slug(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos ya separados por NFD
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "suite"
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
 * Escribe el YAML de la suite y corre el comando real del taller
 * (`uv run laser-toolkit generate-cut/generate-engrave`) sobre ese archivo.
 * Nunca inventa el resultado: si el CLI falla, se devuelve su error tal cual.
 */
export async function generarSuite(
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  const nombreConfig = nombreArchivoConfig(datos);
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
