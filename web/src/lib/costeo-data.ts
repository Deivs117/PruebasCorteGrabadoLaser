import "server-only";

import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  existeArchivoTarifas,
  REGISTROS_DIR,
  REPO_ROOT,
  TARIFAS_PATH,
} from "@/lib/fs-data";
import {
  leerFilasCsv,
  resumenRegistro,
  type ResumenRegistro,
} from "@/lib/registro-data";
import type { FilaCosteada } from "@/lib/registro-schema";

const execFileAsync = promisify(execFile);

export type Costeable = ResumenRegistro & {
  archivoRegistro: string;
  costeado: boolean;
  archivoCosteado: string;
};

function archivoCosteadoDe(archivoRegistro: string): string {
  return archivoRegistro.replace(/\.csv$/, "_costeado.csv");
}

function nombreCosteadoValido(nombre: string): boolean {
  return (
    /^[A-Za-z0-9._-]+_costeado\.csv$/.test(nombre) && !nombre.includes("..")
  );
}

export async function listarCosteables(): Promise<Costeable[]> {
  let archivos: string[];
  try {
    archivos = await readdir(REGISTROS_DIR);
  } catch {
    return [];
  }
  const registros = archivos.filter((n) => n.endsWith("_registro.csv"));
  const costeados = new Set(
    archivos.filter((n) => n.endsWith("_costeado.csv")),
  );

  const resultado: Costeable[] = [];
  for (const archivoRegistro of registros) {
    const resumen = await resumenRegistro(archivoRegistro);
    if (!resumen) continue;
    const archivoCosteado = archivoCosteadoDe(archivoRegistro);
    resultado.push({
      ...resumen,
      archivoRegistro,
      costeado: costeados.has(archivoCosteado),
      archivoCosteado,
    });
  }
  return resultado;
}

export async function leerCosteo(
  archivo: string,
): Promise<FilaCosteada[] | null> {
  if (!nombreCosteadoValido(archivo)) return null;
  try {
    return await leerFilasCsv<FilaCosteada>(path.join(REGISTROS_DIR, archivo));
  } catch {
    return null;
  }
}

export interface ResultadoCosteo {
  ok: boolean;
  archivoCosteado?: string;
  tarifasPendientes?: boolean;
  error?: string;
}

/** Corre `uv run laser-toolkit compute-costs <registro> --tarifas <tarifas>`
 * tal cual — el motor de costeo (los tres componentes por separado, nunca
 * inventa una tarifa) vive únicamente en Python. */
export async function calcularCosteo(
  archivoRegistro: string,
): Promise<ResultadoCosteo> {
  if (
    !/^[A-Za-z0-9._-]+_registro\.csv$/.test(archivoRegistro) ||
    archivoRegistro.includes("..")
  ) {
    return { ok: false, error: "Archivo inválido." };
  }
  if (!(await existeArchivoTarifas())) {
    return {
      ok: false,
      error: "Todavía no se cargaron las tarifas del taller.",
    };
  }

  const rutaRegistro = path.join(REGISTROS_DIR, archivoRegistro);
  try {
    const { stdout } = await execFileAsync(
      "uv",
      [
        "run",
        "laser-toolkit",
        "compute-costs",
        rutaRegistro,
        "--tarifas",
        TARIFAS_PATH,
      ],
      { cwd: REPO_ROOT, timeout: 30_000 },
    );
    const ruta = stdout.match(/Costeo calculado: (\S+)/)?.[1];
    if (!ruta) {
      return {
        ok: false,
        error:
          "Se calculó el costeo pero no se pudo confirmar el archivo resultante.",
      };
    }
    return {
      ok: true,
      archivoCosteado: path.basename(ruta),
      tarifasPendientes: stdout.includes("tarifas sin definir"),
    };
  } catch (error) {
    const mensaje =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : error instanceof Error
          ? error.message
          : "Error desconocido al calcular el costeo.";
    return { ok: false, error: mensaje.trim() };
  }
}
