import { z } from "zod";

/** Espejo de `ParametrosOperacionBody` en `apps/api/main.py` (mismo que
 * `editor-export-schema.ts` -- no se importa de ahí para no atar la
 * validación de "guardar proyecto" a la de "exportar", que puede evolucionar
 * distinto). `potenciaBajaPct`/`potenciaAltaPct` (#95) y las referencias a
 * Ficha (`fichaGrupoId` y afines, #17) son opcionales -- esta última terna
 * es puramente informativa (qué Ficha bloqueó estos valores) pero hace
 * falta persistirla: si no viaja, reabrir un proyecto guardado en modo
 * Producción pierde el "candado" aunque los números numéricos sigan bien. */
const parametrosOperacionSchema = z
  .object({
    velocidadMmMin: z.number().int().gt(0),
    potenciaPct: z.number().int().gt(0).lte(100).optional(),
    potenciaBajaPct: z.number().int().gte(0).lte(100).optional(),
    potenciaAltaPct: z.number().int().gt(0).lte(100).optional(),
    fichaGrupoId: z.string().optional(),
    fichaBajaGrupoId: z.string().optional(),
    fichaAltaGrupoId: z.string().optional(),
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

/** Espejo de `MaterialProduccionBody` en `apps/api/main.py` (#17): material+
 * espesor elegido en modo Producción, por objeto (ver nota de diseño en
 * `editor-tipos.ts`). */
const materialProduccionSchema = z
  .object({
    material: z.string().min(1),
    espesorMm: z.number().gt(0).nullable(),
  })
  .nullable();

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
  // #17, posterior a este schema (#18): material+espesor de modo Producción
  // -- default `null` para que un proyecto guardado ANTES de #17 se siga
  // leyendo bien (nunca existió el campo, nunca hubo modo Producción).
  materialProduccion: materialProduccionSchema.default(null),
  // #150, posterior a #108: `id` del objeto raster de origen cuando este
  // objeto es un contorno de corte generado automáticamente -- opcional
  // (ausente en objetos subidos a mano, y en cualquier objeto de un
  // proyecto guardado antes de #150).
  objetoOrigenId: z.string().min(1).optional(),
  // #179, posterior a #150: mecanismo general de agrupación -- opcional
  // (ausente en un objeto sin grupo, o en cualquier objeto de un proyecto
  // guardado antes de #179).
  grupoId: z.string().min(1).optional(),
  // #179: default `true` para que un proyecto guardado ANTES de esta
  // columna se siga leyendo bien (nunca existió el campo, todo era visible).
  visible: z.boolean().default(true),
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
