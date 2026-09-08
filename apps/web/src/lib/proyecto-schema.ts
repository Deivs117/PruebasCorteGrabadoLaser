import { z } from "zod";

/** Espejo de `ParametrosOperacionBody` en `apps/api/main.py` (mismo que
 * `editor-export-schema.ts` -- no se importa de ahí para no atar la
 * validación de "guardar proyecto" a la de "exportar", que puede evolucionar
 * distinto). */
const parametrosOperacionSchema = z.object({
  velocidadMmMin: z.number().int().gt(0),
  potenciaPct: z.number().int().gt(0).lte(100),
});

const camposComunes = {
  id: z.string().min(1),
  nombre: z.string().min(1),
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
  mantenerProporcion: z.boolean(),
  // #107 agregó espejadoH/espejadoV después de que este schema se escribió
  // (#18) -- default `false` para que un proyecto guardado ANTES de #107
  // siga leyéndose bien (nunca existió el campo, nunca hubo espejo).
  espejadoH: z.boolean().default(false),
  espejadoV: z.boolean().default(false),
};

const objetoProyectoSvgSchema = z.object({
  tipo: z.literal("svg"),
  nombreArchivoSvg: z.string().min(1),
  contenidoSvg: z.string().min(1),
  resolucionRellenoMm: z.number().gt(0),
  ...camposComunes,
});

/** Espejo de `PreprocesamientoRaster` (`raster-preprocesamiento.ts`) --
 * mismo shape que `preprocesamientoRasterSchema` en
 * `editor-export-schema.ts` (no se importa de ahí por la misma razón que
 * `parametrosOperacionSchema`, ver el comentario de arriba). Siempre
 * presente: el modal de preprocesamiento (#109) fija un valor al agregar
 * cualquier objeto raster nuevo. */
const preprocesamientoRasterSchema = {
  canal: z.enum(["luminancia", "rojo", "verde", "azul", "mezcla"]),
  pesoRojo: z.number().min(0).max(1),
  pesoVerde: z.number().min(0).max(1),
  pesoAzul: z.number().min(0).max(1),
  gamma: z.number().gt(0),
  invertir: z.boolean(),
  nivelesPosterizado: z.number().int().min(2).max(256).nullable(),
};

const objetoProyectoRasterSchema = z.object({
  tipo: z.literal("raster"),
  dataUri: z.string().min(1),
  ...camposComunes,
  ...preprocesamientoRasterSchema,
});

/** Espejo de `ObjetoProyectoBody`/`GuardarProyectoBody` en `apps/api/main.py`
 * -- a diferencia de `exportarGcodeSchema`, acá viajan también `id`/
 * `nombre`/`mantenerProporcion`: hacen falta para reconstruir el estado
 * exacto del lienzo al reabrir el proyecto, no solo para generar G-code. */
export const guardarProyectoSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre para el proyecto."),
  objetos: z
    .array(
      z.discriminatedUnion("tipo", [
        objetoProyectoSvgSchema,
        objetoProyectoRasterSchema,
      ]),
    )
    .min(1, "El lienzo no tiene ningún objeto para guardar."),
  materialNombre: z.string().trim().min(1).optional(),
  materialFamilia: z.string().optional(),
  fichaParametroId: z.number().int().optional(),
});

export type GuardarProyectoData = z.infer<typeof guardarProyectoSchema>;
export type ObjetoProyecto = GuardarProyectoData["objetos"][number];
