import "server-only";

import { access, readFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * Lectura de los datos reales del taller (suites de prueba configuradas,
 * corridas registradas, fichas oficiales, tarifas cargadas). No hay backend
 * ni base de datos todavía: esta es la única fuente de verdad, y si un
 * archivo no existe o no se puede leer, se refleja como "sin datos" — nunca
 * se inventa un número.
 *
 * Estos detalles (dónde vive cada cosa en disco) son un detalle de
 * implementación de este módulo: la UI nunca debe mostrarle al operario de
 * taller una ruta de archivo ni el nombre de una carpeta del sistema.
 */

// apps/web/ vive dos niveles bajo la raiz del monorepo (raiz/apps/web).
export const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
// El paquete Python (pyproject.toml/uv.lock) vive en packages/laser_toolkit/.
// "uv run --project" le dice a uv donde esta el proyecto sin cambiar el cwd
// del proceso hijo -- los comandos que invocamos siguen recibiendo rutas de
// config/registro relativas a REPO_ROOT, igual que antes de moverlo.
export const PY_PROJECT_ARGS = ["--project", "packages/laser_toolkit"];
export const CONFIGS_DIR = path.join(REPO_ROOT, "configs");
export const REGISTROS_DIR = path.join(REPO_ROOT, "data", "registros");
export const FOTOS_DIR = path.join(REPO_ROOT, "data", "fotos");
export const TARIFAS_PATH = path.join(CONFIGS_DIR, "tarifas.yaml");

export type Operacion = "corte" | "grabado";
export type TipoSuite = "barrido" | "final_run";

export interface SuiteConfig {
  archivo: string;
  material: string;
  espesorMm: number;
  operacion: Operacion;
  tipo: TipoSuite;
  velocidadesMmMin?: number[];
  potenciasPct?: number[];
  velocidadMmMin?: number;
  potenciaPct?: number;
  repeticiones?: number;
  lote: string;
  /** Cuándo se creó el archivo de configuración, no la fecha de la prueba
   * (`fecha` dentro del YAML, editable) — para saber de verdad hace cuánto
   * existe esta suite antes de eliminarla. */
  creadoEn: string;
}

export interface DashboardSummary {
  suites: SuiteConfig[];
  registrosGenerados: number;
  registrosPreparados: number;
  fichasOficiales: number;
  tarifasConfiguradas: boolean;
}

async function listarArchivos(dir: string): Promise<string[]> {
  try {
    const entradas = await readdir(dir, { withFileTypes: true });
    return entradas.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

function esYamlDeSuite(nombre: string): boolean {
  return (
    nombre.endsWith(".yaml") &&
    !nombre.includes("tarifas") &&
    !nombre.includes("example") &&
    // "ejemplo-dev_*" son las suites de ejemplo que documentan README.md,
    // el docstring de cli.py y el Plan Maestro (make generate-cut CONFIG=...) —
    // configs reales que hay que conservar, no ruido: solo se ocultan de este
    // panel para no mezclarse con las suites reales del taller.
    !nombre.startsWith("ejemplo-dev")
  );
}

async function leerSuite(nombre: string): Promise<SuiteConfig | null> {
  try {
    const rutaArchivo = path.join(CONFIGS_DIR, nombre);
    const [contenido, estado] = await Promise.all([
      readFile(rutaArchivo, "utf-8"),
      stat(rutaArchivo),
    ]);
    const datos = parseYaml(contenido) as Record<string, unknown>;
    // birthtime puede quedar en epoch 0 en sistemas de archivos que no lo
    // soportan — en ese caso, mtime es la mejor aproximación disponible.
    const creadoEn = estado.birthtimeMs > 0 ? estado.birthtime : estado.mtime;

    const material = typeof datos.material === "string" ? datos.material : null;
    const espesorMm =
      typeof datos.espesor_mm === "number" ? datos.espesor_mm : null;
    const operacion =
      datos.operacion === "corte" || datos.operacion === "grabado"
        ? datos.operacion
        : null;

    if (material === null || espesorMm === null || operacion === null) {
      return null;
    }

    const esFinalRun = typeof datos.velocidad_mm_min === "number";

    return {
      archivo: nombre,
      material,
      espesorMm,
      operacion,
      tipo: esFinalRun ? "final_run" : "barrido",
      velocidadesMmMin: Array.isArray(datos.velocidades_mm_min)
        ? (datos.velocidades_mm_min as number[])
        : undefined,
      potenciasPct: Array.isArray(datos.potencias_pct)
        ? (datos.potencias_pct as number[])
        : undefined,
      velocidadMmMin:
        typeof datos.velocidad_mm_min === "number"
          ? datos.velocidad_mm_min
          : undefined,
      potenciaPct:
        typeof datos.potencia_pct === "number" ? datos.potencia_pct : undefined,
      repeticiones:
        typeof datos.repeticiones === "number" ? datos.repeticiones : undefined,
      lote: typeof datos.lote === "string" ? datos.lote : "L01",
      creadoEn: creadoEn.toISOString(),
    };
  } catch {
    return null;
  }
}

/** Suites de prueba configuradas hoy — usado por el Dashboard y por la sección Suites. */
export async function listarSuites(): Promise<SuiteConfig[]> {
  const archivos = (await listarArchivos(CONFIGS_DIR)).filter(esYamlDeSuite);
  const suites = await Promise.all(archivos.map(leerSuite));
  return suites.filter((s): s is SuiteConfig => s !== null);
}

/** Solo borra un archivo que ya pasó `esYamlDeSuite` (nunca tarifas.yaml,
 * nunca nada fuera de configs/) — CRUD real, no un botón que no hace nada. */
export async function eliminarSuite(archivo: string): Promise<boolean> {
  if (
    !esYamlDeSuite(archivo) ||
    archivo.includes("/") ||
    archivo.includes("..")
  ) {
    return false;
  }
  try {
    await unlink(path.join(CONFIGS_DIR, archivo));
    return true;
  } catch {
    return false;
  }
}

async function contarRegistros(): Promise<{
  generados: number;
  preparados: number;
}> {
  const archivos = (await listarArchivos(REGISTROS_DIR)).filter((n) =>
    n.endsWith(".csv"),
  );
  const preparados = archivos.filter((n) => n.includes("_registro")).length;
  const generados = archivos.length - preparados;
  return { generados, preparados };
}

/**
 * TODO(#7, #1): las Fichas de Parámetro Estándar van a vivir en una tabla de
 * Supabase, no como archivos — reemplazar esto por una query real cuando esa
 * migración esté lista. Antes escaneaba docs/materiales/<material>/fichas-parametro/,
 * pero esa carpeta se eliminó (quedó sin propósito con la decisión de ir directo
 * a Supabase); devolver 0 explícito es más honesto que escanear una carpeta
 * que ya sabemos que nunca va a tener nada.
 */
async function contarFichasOficiales(): Promise<number> {
  return 0;
}

export async function existeArchivoTarifas(): Promise<boolean> {
  try {
    await access(TARIFAS_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [suites, registros, fichasOficiales, tarifasConfiguradas] =
    await Promise.all([
      listarSuites(),
      contarRegistros(),
      contarFichasOficiales(),
      existeArchivoTarifas(),
    ]);

  return {
    suites,
    registrosGenerados: registros.generados,
    registrosPreparados: registros.preparados,
    fichasOficiales,
    tarifasConfiguradas,
  };
}
