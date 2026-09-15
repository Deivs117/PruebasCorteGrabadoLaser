import { z } from "zod";

/** Espejo de `MarcoCorteBody` en `apps/api/main.py` (issue #196, botón
 * "Generar marco de corte" del panel del objeto -- svg o raster). */
export const marcoCorteSchema = z.object({
  tipo: z.enum(["svg", "raster"]),
  anchoMm: z.number().gt(0, "El ancho debe ser mayor a 0."),
  altoMm: z.number().gt(0, "El alto debe ser mayor a 0."),
  rotacionDeg: z.number(),
  forma: z.enum(["circulo", "cuadrado"]),
  tamanoMm: z.number().gt(0, "El tamaño debe ser mayor a 0."),
  // Solo para tipo="svg":
  contenidoSvg: z.string().optional(),
  // Solo para tipo="raster":
  dataUri: z.string().optional(),
  umbralDistanciaFondo: z.number().min(0).max(1).optional(),
});

export type MarcoCorteData = z.infer<typeof marcoCorteSchema>;

/** Tamaño por defecto del marco (diámetro o lado, según `forma`) -- sin un
 * pedido real de negocio que sugiera otro número, se usa un valor de taller
 * típico para una pieza chica (más fácil de ajustar hacia arriba que
 * adivinar un default gigante). */
export const TAMANO_MARCO_MM_POR_DEFECTO = 50;
