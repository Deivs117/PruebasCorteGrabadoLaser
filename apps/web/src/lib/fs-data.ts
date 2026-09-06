import "server-only";

import path from "node:path";
import { pyGet } from "@/lib/py-api";

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

export type Operacion = "corte" | "grabado";

/**
 * Espejo de `lectura.suites()` en `apps/api` -- la tabla `suites` de
 * Supabase (issue #22) solo describe barridos, Final Run vive en otra tabla
 * (`final_runs`, ver (E) del plan reordenado de #2), así que ya no hace
 * falta distinguir "tipo" como cuando ambos eran YAML en la misma carpeta.
 */
export interface SuiteConfig {
  id: number;
  material: string;
  espesorMm: number;
  operacion: Operacion;
  velocidadesMmMin: number[];
  potenciasPct: number[];
  lote: string;
  /** Cuándo se creó la fila, no la fecha de la prueba (`fecha`, editable). */
  creadoEn: string;
  /** `null` si por algún motivo la suite no tiene Registro asociado todavía
   * (no debería pasar en el flujo normal -- #56 los crea juntos). */
  corridaId: string | null;
  gcodeStorageKey: string | null;
}

export interface DashboardSummary {
  suitesBarrido: number;
  suitesFinalRun: number;
  registros: number;
  registrosCompletados: number;
  fichasOficiales: number;
  tarifasConfiguradas: boolean;
}

/** Suites de prueba configuradas hoy — usado por el Dashboard y por la
 * sección Suites, vía el servicio Python de #47/(A). */
export async function listarSuites(): Promise<SuiteConfig[]> {
  return pyGet<SuiteConfig[]>("suites");
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return pyGet<DashboardSummary>("dashboard");
}
