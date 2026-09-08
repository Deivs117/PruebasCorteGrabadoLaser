import { z } from "zod";

/** Espejo de `ParametrosOperacionBody` en `apps/api/main.py`. `potenciaPct`
 * es el par velocidad/potencia de una sola pasada (corte, y grabado de SVG
 * por relleno constante); `potenciaBajaPct`/`potenciaAltaPct` son el rango
 * real de potencia calibrado del grabado raster (#95, UI en #17) -- un
 * objeto usa uno u otro según `tipo`/operación, nunca ninguno de los dos a
 * la vez (de ahí el `refine`, espejo del guard de `_rango_potencia_grabado`
 * en `apps/api/editor.py`). Las referencias a Ficha (`fichaGrupoId` y
 * afines, #17) no viajan acá a propósito: son puramente informativas para
 * la UI del editor, el G-code se arma solo con los valores numéricos. */
const parametrosOperacionSchema = z
  .object({
    velocidadMmMin: z.number().int().gt(0),
    potenciaPct: z.number().int().gt(0).lte(100).optional(),
    potenciaBajaPct: z.number().int().gte(0).lte(100).optional(),
    potenciaAltaPct: z.number().int().gt(0).lte(100).optional(),
  })
  .refine(
    (p) =>
      p.potenciaPct !== undefined ||
      (p.potenciaBajaPct !== undefined && p.potenciaAltaPct !== undefined),
    {
      message:
        "Cada operación necesita potenciaPct, o potenciaBajaPct y potenciaAltaPct juntos.",
    },
  );

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

/** Espejo de `PreprocesamientoRaster` (`raster-preprocesamiento.ts`) /
 * `ConfiguracionRaster` (`laser_toolkit.raster.config`, issue #15) --
 * campos de canal/gamma/invertir/posterizado del preprocesamiento de
 * imagen (#109), siempre presentes en un objeto raster nuevo (el modal fija
 * un valor, nunca deja el campo sin definir). */
const preprocesamientoRasterSchema = {
  canal: z.enum(["luminancia", "rojo", "verde", "azul", "mezcla"]),
  pesoRojo: z.number().min(0).max(1),
  pesoVerde: z.number().min(0).max(1),
  pesoAzul: z.number().min(0).max(1),
  gamma: z.number().gt(0),
  invertir: z.boolean(),
  nivelesPosterizado: z.number().int().min(2).max(256).nullable(),
};

const objetoRasterExportarSchema = z.object({
  tipo: z.literal("raster"),
  dataUri: z.string().min(1),
  ...camposComunes,
  ...preprocesamientoRasterSchema,
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
  // Issue #18, opcional: si la exportación se pide desde un proyecto de
  // diseño ya guardado, la key del .gcode también queda en su historial.
  proyectoId: z.number().int().nullish(),
});

export type ObjetoExportar = z.infer<
  typeof exportarGcodeSchema
>["objetos"][number];
