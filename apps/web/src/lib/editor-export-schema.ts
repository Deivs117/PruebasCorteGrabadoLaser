import { z } from "zod";

/** Espejo de `ParametrosOperacionBody` en `apps/api/main.py`. */
const parametrosOperacionSchema = z.object({
  velocidadMmMin: z.number().int().gt(0),
  potenciaPct: z.number().int().gt(0).lte(100),
});

const camposComunes = {
  xMm: z.number(),
  yMm: z.number(),
  anchoMm: z.number().gt(0),
  altoMm: z.number().gt(0),
  rotacionDeg: z.number(),
  operaciones: z.array(z.enum(["corte", "grabado"])).min(1),
  parametros: z.object({
    corte: parametrosOperacionSchema,
    grabado: parametrosOperacionSchema,
  }),
};

const objetoSvgExportarSchema = z.object({
  tipo: z.literal("svg"),
  contenidoSvg: z.string().min(1),
  resolucionRellenoMm: z.number().gt(0),
  ...camposComunes,
});

const objetoRasterExportarSchema = z.object({
  tipo: z.literal("raster"),
  dataUri: z.string().min(1),
  ...camposComunes,
});

/** Espejo de `ObjetoExportarBody`/`ExportarGcodeBody` en `apps/api/main.py`
 * -- valida en el borde del servidor lo que ya está tipado en el cliente
 * (`ObjetoLienzo`), mismo criterio que el resto de las rutas de escritura. */
export const exportarGcodeSchema = z.object({
  objetos: z
    .array(
      z.discriminatedUnion("tipo", [
        objetoSvgExportarSchema,
        objetoRasterExportarSchema,
      ]),
    )
    .min(1, "El lienzo no tiene ningún objeto para exportar."),
});

export type ObjetoExportar = z.infer<
  typeof exportarGcodeSchema
>["objetos"][number];
