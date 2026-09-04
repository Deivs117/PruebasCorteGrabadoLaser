import { z } from "zod";

/**
 * Espejo en TypeScript de `SuiteConfig` (src/laser_toolkit/config.py). Las
 * mismas restricciones que valida pydantic del lado Python, para que el
 * formulario avise del error antes de llegar al servidor — pero la
 * validación real y definitiva sigue siendo la del CLI, no esta.
 */
export const modoGrabadoSvgSchema = z.enum([
  "contorno",
  "relleno",
  "contorno_y_relleno",
]);

export const suiteSchema = z.object({
  operacion: z.enum(["corte", "grabado"]),
  material: z.string().trim().min(1, "Ingresá el material."),
  espesorMm: z.number().gt(0, "El espesor debe ser mayor a 0."),
  lote: z.string().trim().min(1, "Ingresá un identificador de lote."),
  velocidadesMmMin: z
    .array(z.number().int().gt(0))
    .min(1, "Agregá al menos una velocidad."),
  potenciasPct: z
    .array(z.number().int().gt(0).lte(100))
    .min(1, "Agregá al menos una potencia."),
  pasadas: z.number().int().gte(1),
  tamanoCeldaMm: z.number().gt(0),
  espaciadoMm: z.number().gte(0),
  // Geometría de cada celda: cuadrado genérico (svgPath ausente) o el
  // contorno/relleno de un SVG guardado (espejo de SuiteConfig.svg_path).
  // En corte, modoGrabadoSvg/svgResolucionRellenoMm se ignoran (cortar
  // siempre traza solo el contorno) — igual que en el backend.
  svgPath: z.string().optional(),
  modoGrabadoSvg: modoGrabadoSvgSchema.optional(),
  svgResolucionRellenoMm: z.number().gt(0).optional(),
});

export type SuiteFormData = z.infer<typeof suiteSchema>;

/** "C" para corte, "G" para grabado — misma convención que las suites ya existentes. */
export function idPrefijo(operacion: "corte" | "grabado"): string {
  return operacion === "corte" ? "C" : "G";
}

export function totalCeldas(datos: {
  velocidadesMmMin: number[];
  potenciasPct: number[];
}): number {
  return datos.velocidadesMmMin.length * datos.potenciasPct.length;
}

// Espejo de `dimensiones_totales_mm` en src/laser_toolkit/gcode/writer.py:
// mismos dos números mágicos (alto y margen de la etiqueta de ID grabada
// arriba de la fila superior). Si esos valores cambian del lado Python, hay
// que actualizarlos acá también — están cubiertos por tests en ambos lados.
const ALTO_ETIQUETA_MM = 2.0;
const MARGEN_ETIQUETA_MM = 3.0;

/** Ancho x alto reales (mm) que va a ocupar la grilla completa de la suite
 * sobre el material, dado lo que el técnico ya cargó en el wizard (velocidades,
 * potencias, tamaño de celda, espaciado) — para avisar de antemano si no cabe
 * en una pieza de área restringida (ej. una carcasa de teléfono). */
export function dimensionesTotalesMm(datos: {
  velocidadesMmMin: number[];
  potenciasPct: number[];
  tamanoCeldaMm: number;
  espaciadoMm: number;
}): { anchoMm: number; altoMm: number } {
  const paso = datos.tamanoCeldaMm + datos.espaciadoMm;
  const nColumnas = datos.velocidadesMmMin.length;
  const nFilas = datos.potenciasPct.length;
  const anchoMm = (nColumnas - 1) * paso + datos.tamanoCeldaMm;
  const altoMm =
    (nFilas - 1) * paso +
    datos.tamanoCeldaMm +
    MARGEN_ETIQUETA_MM +
    ALTO_ETIQUETA_MM;
  return { anchoMm, altoMm };
}
