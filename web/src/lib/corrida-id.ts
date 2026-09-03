import "server-only";

/**
 * Espejo de `nombre_base` en src/laser_toolkit/naming.py — SOLO para
 * predecir si guardar esta suite chocaría con una corrida ya generada
 * (mismo nombre de archivo de salida). Nunca se usa para generar el nombre
 * real: eso lo sigue haciendo el CLI de Python.
 *
 * El asistente nunca expone el campo `fecha` de SuiteConfig (siempre se
 * omite al escribir el YAML), así que el CLI usa la fecha de hoy — esta
 * función asume lo mismo.
 */
export function predecirCorridaId(datos: {
  material: string;
  espesorMm: number;
  operacion: "corte" | "grabado";
  lote: string;
}): string {
  const materialSlug = datos.material.trim().split(/\s+/).join("-");
  const hoy = new Date();
  const fecha = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");
  // Refleja el formato "%g" de Python para los espesores usuales del taller
  // (sin notación científica) — 3 -> "3", 3.5 -> "3.5".
  const espesor = String(datos.espesorMm);
  return `${materialSlug}_${espesor}mm_${datos.operacion}_${fecha}_${datos.lote}`;
}
