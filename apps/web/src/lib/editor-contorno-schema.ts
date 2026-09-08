import { z } from "zod";

/** Espejo de `ContornoCorteBody` en `apps/api/main.py` (issue #108, botón
 * "Generar contorno de corte" del panel del objeto raster). */
export const contornoCorteSchema = z.object({
  dataUri: z.string().min(1, "Falta la imagen del objeto."),
  anchoMm: z.number().gt(0, "El ancho debe ser mayor a 0."),
  altoMm: z.number().gt(0, "El alto debe ser mayor a 0."),
  margenMm: z.number().gte(0, "El margen no puede ser negativo."),
});

export type ContornoCorteData = z.infer<typeof contornoCorteSchema>;

/** Mismo margen por defecto que documenta el ticket #108 -- suficiente
 * separación del borde real del diseño para que una imprecisión chica de la
 * máquina no recorte la pieza. */
export const MARGEN_CONTORNO_MM_POR_DEFECTO = 2;
