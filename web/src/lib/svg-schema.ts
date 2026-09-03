import { z } from "zod";

/** Espejo de los flags de `laser-toolkit svg-to-gcode` y de `ModoGrabadoSvg`
 * (src/laser_toolkit/svg/modo.py). */
export const modoGrabadoSvgSchema = z.enum([
  "contorno",
  "relleno",
  "contorno_y_relleno",
]);
export type ModoGrabadoSvg = z.infer<typeof modoGrabadoSvgSchema>;

export const conversionSvgSchema = z.object({
  anchoMm: z.number().gt(0, "El ancho debe ser mayor a 0."),
  altoMm: z.number().gt(0, "El alto debe ser mayor a 0."),
  velocidadMmMin: z.number().int().gt(0, "La velocidad debe ser mayor a 0."),
  potenciaPct: z
    .number()
    .int()
    .gt(0)
    .lte(100, "La potencia debe estar entre 1 y 100."),
  modo: modoGrabadoSvgSchema,
  resolucionRellenoMm: z.number().gt(0),
});

export type ConversionSvgData = z.infer<typeof conversionSvgSchema>;

export const DEFAULTS_CONVERSION_SVG = {
  anchoMm: 30,
  altoMm: 30,
  velocidadMmMin: 1200,
  potenciaPct: 25,
  modo: "contorno_y_relleno" as const,
  resolucionRellenoMm: 0.3,
};
