import "server-only";

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { CONFIGS_DIR, REGISTROS_DIR, REPO_ROOT } from "@/lib/fs-data";
import { existeArchivo, predecirCorridaId } from "@/lib/corrida-id";
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

/** Solo los campos que administra el asistente — nunca todo el YAML: al
 * editar, esto se fusiona sobre el archivo original en vez de reemplazarlo
 * entero, para no borrar configuración que el formulario no muestra (ej. un
 * `machine` con valores no default). Ver `actualizarSuite`. */
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

/**
 * Evita el incidente real que motivó esto: editar una suite que ya tiene su
 * Hoja de Registro preparada (`_registro.csv`) regenera el `.csv` hermano
 * bajo el MISMO nombre (mismo material+espesor+operación+fecha+lote) y, si
 * después se corre "Preparar registro" de nuevo, pisa en silencio las
 * mediciones y notas ya guardadas. En vez de bloquear todas las ediciones
 * (el `.csv` se regenera solo en cada guardado, incluso recién creada la
 * suite, así que bloquear por su sola existencia rompería la edición normal
 * antes de correr nada), esto solo bloquea cuando ya existe un
 * `_registro.csv` real para esa identidad — ahí sí hay datos del técnico en
 * juego.
 */
async function corridaYaRegistrada(datos: SuiteFormData): Promise<boolean> {
  const corridaId = predecirCorridaId(datos);
  return existeArchivo(path.join(REGISTROS_DIR, `${corridaId}_registro.csv`));
}

export async function generarSuite(
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  return escribirYGenerar(
    nombreArchivoConfig(datos),
    camposConocidos(datos),
    datos.operacion,
  );
}

/**
 * Guarda los cambios sobre el mismo archivo de configuración (no crea uno
 * nuevo) y regenera su G-code — editar una suite implica que la máquina
 * corra la versión actualizada, no solo cambiar un número en un formulario.
 *
 * Fusiona los campos del formulario sobre el YAML original en vez de
 * reemplazarlo entero: el asistente no conoce todos los campos posibles de
 * `SuiteConfig` (ej. `machine` con valores no default) y sobreescribir el
 * archivo completo borraría esos campos en silencio.
 */
export async function actualizarSuite(
  archivoExistente: string,
  datos: SuiteFormData,
): Promise<ResultadoGeneracion> {
  if (!nombreDeSuiteValido(archivoExistente)) {
    return { ok: false, error: "Archivo inválido." };
  }

  if (await corridaYaRegistrada(datos)) {
    return {
      ok: false,
      error:
        'Ya existe una Hoja de Registro preparada para este material, espesor, operación y lote de hoy. Guardar esta edición pisaría esas mediciones en silencio — usá "Duplicar" con un lote distinto en vez de editar esta suite.',
    };
  }

  let original: Record<string, unknown> = {};
  try {
    original =
      (parseYaml(
        await readFile(path.join(CONFIGS_DIR, archivoExistente), "utf-8"),
      ) as Record<string, unknown> | null) ?? {};
  } catch {
    // No existía o no se pudo leer: se escribe desde cero con lo que sabe el asistente.
  }

  const fusionado = { ...original, ...camposConocidos(datos) };
  // El spread de arriba no borra una clave que `camposConocidos` omite: si
  // el técnico quitó el SVG en el formulario, hay que sacarlo a mano.
  if (!datos.svgPath) {
    delete fusionado.svg_path;
    delete fusionado.modo_grabado_svg;
    delete fusionado.svg_resolucion_relleno_mm;
  }

  return escribirYGenerar(archivoExistente, fusionado, datos.operacion);
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
      svgPath: typeof datos.svg_path === "string" ? datos.svg_path : undefined,
      modoGrabadoSvg:
        datos.modo_grabado_svg === "contorno" ||
        datos.modo_grabado_svg === "relleno" ||
        datos.modo_grabado_svg === "contorno_y_relleno"
          ? datos.modo_grabado_svg
          : undefined,
      svgResolucionRellenoMm:
        typeof datos.svg_resolucion_relleno_mm === "number"
          ? datos.svg_resolucion_relleno_mm
          : undefined,
    };
  } catch {
    return null;
  }
}
