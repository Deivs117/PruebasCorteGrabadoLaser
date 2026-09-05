import "server-only";

import { execFile } from "node:child_process";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  CONFIGS_DIR,
  FOTOS_DIR,
  PY_PROJECT_ARGS,
  REGISTROS_DIR,
  REPO_ROOT,
  eliminarSuite,
} from "@/lib/fs-data";
import { leerFilasCsv } from "@/lib/registro-data";
import type { FilaRegistro } from "@/lib/registro-schema";
import { slug } from "@/lib/slug";
import type { FinalRunFormData } from "@/lib/final-run-schema";

const execFileAsync = promisify(execFile);

// Mismo principio que en generar-suite.ts y registro-data.ts: la lógica de
// nombrado, generación y estadística vive únicamente en Python. Este módulo
// nunca la reimplementa, solo escribe el YAML y lee lo que el propio CLI
// reporta.

function nombreArchivoConfig(datos: {
  material: string;
  espesorMm: number;
  operacion: "corte" | "grabado";
  velocidadMmMin: number;
  potenciaPct: number;
}): string {
  return `final-${slug(datos.material)}-${datos.espesorMm}mm-${datos.operacion}-${datos.velocidadMmMin}mmmin-${datos.potenciaPct}pct.yaml`;
}

function construirYaml(datos: FinalRunFormData, ejecucion: number): string {
  return stringifyYaml({
    material: datos.material,
    espesor_mm: datos.espesorMm,
    operacion: datos.operacion,
    velocidad_mm_min: datos.velocidadMmMin,
    potencia_pct: datos.potenciaPct,
    pasadas: datos.pasadas,
    repeticiones: datos.repeticiones,
    ejecucion,
    tamano_celda_mm: datos.tamanoCeldaMm,
    espaciado_mm: datos.espaciadoMm,
    id_prefijo: "F",
    lote: datos.lote,
  });
}

export interface ResultadoFinalRun {
  ok: boolean;
  gcodeFileName?: string;
  csvFileName?: string;
  celdas?: number;
  ejecucion?: number;
  error?: string;
}

const PATRON_GCODE = /G-code generado: (\S+)/;
const PATRON_CSV =
  /CSV hermano generado: (\S+) \((\d+) celdas, ejecucion (\d+)\)/;

/** Escribe el YAML del grupo (nombre determinado por su combinación
 * material/espesor/operación/velocidad/potencia — dos ejecuciones de la
 * MISMA combinación son, por definición, el mismo grupo) y corre
 * `generate-final-run --ejecucion N` tal cual. */
export async function generarFinalRun(
  datos: FinalRunFormData,
  ejecucion: number,
): Promise<ResultadoFinalRun> {
  const nombreConfig = nombreArchivoConfig(datos);
  const rutaConfig = path.join(CONFIGS_DIR, nombreConfig);
  await writeFile(rutaConfig, construirYaml(datos, ejecucion), "utf-8");

  try {
    const { stdout } = await execFileAsync(
      "uv",
      [
        "run",
        ...PY_PROJECT_ARGS,
        "laser-toolkit",
        "generate-final-run",
        rutaConfig,
        "--ejecucion",
        String(ejecucion),
      ],
      { cwd: REPO_ROOT, timeout: 30_000 },
    );

    const gcode = stdout.match(PATRON_GCODE)?.[1];
    const csv = stdout.match(PATRON_CSV);
    const csvPath = csv?.[1];
    const csvCeldas = csv?.[2];
    const csvEjecucion = csv?.[3];

    if (!gcode || !csvPath || !csvCeldas || !csvEjecucion) {
      return {
        ok: false,
        error:
          "Se generó la ejecución pero no se pudo confirmar el resultado. Revisá la salida del taller manualmente.",
      };
    }

    return {
      ok: true,
      gcodeFileName: path.basename(gcode),
      csvFileName: path.basename(csvPath),
      celdas: Number(csvCeldas),
      ejecucion: Number(csvEjecucion),
    };
  } catch (error) {
    const mensaje =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : error instanceof Error
          ? error.message
          : "Error desconocido al generar la ejecución.";
    return { ok: false, error: mensaje.trim() };
  }
}

export interface EjecucionFinalRun {
  archivo: string;
  ejecucion: number;
  corridaId: string;
  calibrada: boolean;
}

export interface GrupoCalibracion {
  grupoId: string;
  material: string;
  espesorMm: string;
  operacion: string;
  velocidadMmMin: string;
  potenciaPct: string;
  repeticiones: number;
  ejecuciones: EjecucionFinalRun[];
}

function filaCalibrada(fila: FilaRegistro): boolean {
  return fila.kwh_corrida_medido !== "" && fila.tiempo_real_corrida_s !== "";
}

/** Agrupa las ejecuciones ya preparadas (`_registro.csv`) por
 * `grupo_calibracion_id` — la misma columna que agrupa `summarize-final-run`
 * en Python, leída tal cual del csv, nunca recalculada. */
export async function listarGruposCalibracion(): Promise<GrupoCalibracion[]> {
  let archivos: string[];
  try {
    archivos = await readdir(REGISTROS_DIR);
  } catch {
    return [];
  }
  const registros = archivos.filter(
    (n) => n.startsWith("FINAL_") && n.endsWith("_registro.csv"),
  );

  const grupos = new Map<string, GrupoCalibracion>();
  for (const archivo of registros) {
    let filas: FilaRegistro[];
    try {
      filas = await leerFilasCsv<FilaRegistro>(
        path.join(REGISTROS_DIR, archivo),
      );
    } catch {
      continue;
    }
    const primera = filas[0];
    if (!primera?.grupo_calibracion_id) continue;

    const grupoId = primera.grupo_calibracion_id;
    const grupo = grupos.get(grupoId) ?? {
      grupoId,
      material: primera.material,
      espesorMm: primera.espesor_mm,
      operacion: primera.operacion,
      velocidadMmMin: primera.velocidad_mm_min,
      potenciaPct: primera.potencia_pct,
      repeticiones: filas.length,
      ejecuciones: [],
    };
    grupo.ejecuciones.push({
      archivo,
      ejecucion: Number(primera.ejecucion),
      corridaId: primera.corrida_id,
      calibrada: filas.every(filaCalibrada),
    });
    grupos.set(grupoId, grupo);
  }

  const resultado = [...grupos.values()];
  for (const grupo of resultado) {
    grupo.ejecuciones.sort((a, b) => a.ejecucion - b.ejecucion);
  }
  return resultado;
}

/** Lee la configuración original de un grupo (creada por `generarFinalRun`)
 * a partir de su combinación material/espesor/operación/velocidad/potencia
 * — el nombre del archivo es determinístico, así que no hace falta guardar
 * la relación aparte. Si el archivo ya no existe, no se puede generar otra
 * ejecución en automático (no se adivinan espaciado/repeticiones). */
async function leerConfigGrupo(
  grupo: GrupoCalibracion,
): Promise<FinalRunFormData | null> {
  const nombreConfig = nombreArchivoConfig({
    material: grupo.material,
    espesorMm: Number(grupo.espesorMm),
    operacion: grupo.operacion as "corte" | "grabado",
    velocidadMmMin: Number(grupo.velocidadMmMin),
    potenciaPct: Number(grupo.potenciaPct),
  });
  try {
    const contenido = await readFile(
      path.join(CONFIGS_DIR, nombreConfig),
      "utf-8",
    );
    const datos = parseYaml(contenido) as Record<string, unknown>;
    if (
      typeof datos.material !== "string" ||
      typeof datos.espesor_mm !== "number"
    ) {
      return null;
    }
    return {
      operacion: datos.operacion === "grabado" ? "grabado" : "corte",
      material: datos.material,
      espesorMm: datos.espesor_mm,
      lote: typeof datos.lote === "string" ? datos.lote : "L01",
      velocidadMmMin: Number(datos.velocidad_mm_min),
      potenciaPct: Number(datos.potencia_pct),
      pasadas: typeof datos.pasadas === "number" ? datos.pasadas : 1,
      repeticiones:
        typeof datos.repeticiones === "number"
          ? datos.repeticiones
          : grupo.repeticiones,
      tamanoCeldaMm:
        typeof datos.tamano_celda_mm === "number" ? datos.tamano_celda_mm : 15,
      espaciadoMm:
        typeof datos.espaciado_mm === "number" ? datos.espaciado_mm : 5,
    };
  } catch {
    return null;
  }
}

/** Genera la siguiente ejecución independiente de un grupo ya existente,
 * con exactamente los mismos parámetros — el punto de una Final Run es
 * repetir la combinación, no volver a elegirla. */
export async function generarSiguienteEjecucion(
  grupoId: string,
): Promise<ResultadoFinalRun> {
  const grupos = await listarGruposCalibracion();
  const grupo = grupos.find((g) => g.grupoId === grupoId);
  if (!grupo)
    return { ok: false, error: "Grupo de calibración no encontrado." };

  const config = await leerConfigGrupo(grupo);
  if (!config) {
    return {
      ok: false,
      error:
        "No se encontró la configuración original de este grupo — no se puede generar otra ejecución en automático.",
    };
  }

  const siguiente =
    Math.max(0, ...grupo.ejecuciones.map((e) => e.ejecucion)) + 1;
  return generarFinalRun(config, siguiente);
}

export interface ResultadoResumen {
  ok: boolean;
  nEjecuciones?: number;
  kwhPorUnidadMedio?: number;
  kwhPorUnidadDesvStd?: number;
  kwhPorUnidadCvPct?: number;
  tiempoPorUnidadMedio?: number;
  tiempoPorUnidadDesvStd?: number;
  tiempoPorUnidadCvPct?: number;
  calibrado?: boolean;
  error?: string;
}

const PATRON_EJECUCIONES = /Ejecuciones analizadas: (\d+)/;
const PATRON_KWH_MULTI =
  /kWh por unidad: ([\d.]+)\s+\(desv\. std ([\d.]+), CV ([\d.]+)%\)/;
const PATRON_KWH_UNICA = /kWh por unidad: ([\d.]+)\s+\(una sola ejecucion/;
const PATRON_TIEMPO_MULTI =
  /Tiempo por unidad: ([\d.]+) s\s+\(desv\. std ([\d.]+)s, CV ([\d.]+)%\)/;
const PATRON_TIEMPO_UNICA =
  /Tiempo por unidad: ([\d.]+) s\s+\(una sola ejecucion/;
const PATRON_ESTADO = /Estado: (CALIBRADO|PENDIENTE)/;

/** Corre `uv run laser-toolkit summarize-final-run <csv...>` tal cual —
 * la estadística (media, desviación estándar, CV%) la calcula únicamente
 * `laser_toolkit.calibracion`, nunca se reimplementa acá. */
export async function resumirCalibracion(
  grupoId: string,
  minimoEjecuciones = 3,
): Promise<ResultadoResumen> {
  const grupos = await listarGruposCalibracion();
  const grupo = grupos.find((g) => g.grupoId === grupoId);
  if (!grupo)
    return { ok: false, error: "Grupo de calibración no encontrado." };
  if (grupo.ejecuciones.some((e) => !e.calibrada)) {
    return {
      ok: false,
      error:
        "Todavía hay ejecuciones sin el kWh medido y el tiempo real cargados.",
    };
  }

  const rutas = grupo.ejecuciones.map((e) =>
    path.join(REGISTROS_DIR, e.archivo),
  );
  try {
    const { stdout } = await execFileAsync(
      "uv",
      [
        "run",
        ...PY_PROJECT_ARGS,
        "laser-toolkit",
        "summarize-final-run",
        ...rutas,
        "--minimo-ejecuciones",
        String(minimoEjecuciones),
      ],
      { cwd: REPO_ROOT, timeout: 30_000 },
    );

    const nEjecuciones = stdout.match(PATRON_EJECUCIONES)?.[1];
    const kwhMulti = stdout.match(PATRON_KWH_MULTI);
    const kwhUnica = stdout.match(PATRON_KWH_UNICA);
    const tiempoMulti = stdout.match(PATRON_TIEMPO_MULTI);
    const tiempoUnica = stdout.match(PATRON_TIEMPO_UNICA);
    const estado = stdout.match(PATRON_ESTADO)?.[1];

    if (
      !nEjecuciones ||
      !estado ||
      (!kwhMulti && !kwhUnica) ||
      (!tiempoMulti && !tiempoUnica)
    ) {
      return {
        ok: false,
        error:
          "Se calculó el resumen pero no se pudo interpretar el resultado.",
      };
    }

    return {
      ok: true,
      nEjecuciones: Number(nEjecuciones),
      kwhPorUnidadMedio: Number((kwhMulti ?? kwhUnica)?.[1]),
      kwhPorUnidadDesvStd: kwhMulti ? Number(kwhMulti[2]) : undefined,
      kwhPorUnidadCvPct: kwhMulti ? Number(kwhMulti[3]) : undefined,
      tiempoPorUnidadMedio: Number((tiempoMulti ?? tiempoUnica)?.[1]),
      tiempoPorUnidadDesvStd: tiempoMulti ? Number(tiempoMulti[2]) : undefined,
      tiempoPorUnidadCvPct: tiempoMulti ? Number(tiempoMulti[3]) : undefined,
      calibrado: estado === "CALIBRADO",
    };
  } catch (error) {
    const mensaje =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : error instanceof Error
          ? error.message
          : "Error desconocido al resumir la calibración.";
    return { ok: false, error: mensaje.trim() };
  }
}

/**
 * Borra el G-code, el csv generado y el csv de registro de una ejecución,
 * más las fotos que le subieron. A diferencia de una suite de barrido, acá
 * `corrida_id` (usado para nombrar las fotos) NO es el nombre base del
 * archivo — el archivo real lleva además el prefijo `FINAL_` y el sufijo
 * de fecha/lote (ver `nombre_base_final_run` en naming.py), así que no se
 * puede reutilizar `eliminarCorrida` de registro-data.ts tal cual.
 */
async function eliminarEjecucion(ejecucion: EjecucionFinalRun): Promise<void> {
  const base = ejecucion.archivo.replace(/_registro\.csv$/, "");
  await Promise.all([
    unlink(path.join(REGISTROS_DIR, ejecucion.archivo)).catch(() => undefined),
    unlink(path.join(REGISTROS_DIR, `${base}.csv`)).catch(() => undefined),
    unlink(path.join(REGISTROS_DIR, `${base}.gcode`)).catch(() => undefined),
  ]);

  try {
    const prefijo = `${slug(ejecucion.corridaId)}_`;
    const fotos = (await readdir(FOTOS_DIR)).filter((n) =>
      n.startsWith(prefijo),
    );
    await Promise.all(
      fotos.map((n) => unlink(path.join(FOTOS_DIR, n)).catch(() => undefined)),
    );
  } catch {
    // sin fotos o carpeta inexistente: no es un error.
  }
}

/** Borra todas las ejecuciones del grupo y su configuración original. */
export async function eliminarGrupoCalibracion(
  grupoId: string,
): Promise<boolean> {
  const grupos = await listarGruposCalibracion();
  const grupo = grupos.find((g) => g.grupoId === grupoId);
  if (!grupo) return false;

  await Promise.all(grupo.ejecuciones.map(eliminarEjecucion));

  const nombreConfig = nombreArchivoConfig({
    material: grupo.material,
    espesorMm: Number(grupo.espesorMm),
    operacion: grupo.operacion as "corte" | "grabado",
    velocidadMmMin: Number(grupo.velocidadMmMin),
    potenciaPct: Number(grupo.potenciaPct),
  });
  await eliminarSuite(nombreConfig);
  return true;
}
