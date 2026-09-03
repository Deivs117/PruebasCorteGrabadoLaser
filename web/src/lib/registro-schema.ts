import { z } from "zod";

/**
 * Espejo de src/laser_toolkit/io/csv_export.py (CAMPOS_CSV) y
 * src/laser_toolkit/io/registro.py (COLUMNAS_MANUALES): mismo orden de
 * columnas, para nunca corromper un csv real del taller al reescribirlo.
 */
export const CAMPOS_CSV = [
  "corrida_id",
  "grupo_calibracion_id",
  "ejecucion",
  "id_prueba",
  "lote",
  "fecha",
  "material",
  "espesor_mm",
  "operacion",
  "velocidad_mm_min",
  "potencia_pct",
  "pasadas",
  "x_mm",
  "y_mm",
  "tamano_celda_mm",
  "area_material_mm2",
  "tiempo_estimado_celda_s",
] as const;

export const COLUMNAS_MANUALES = [
  "corte_pasante",
  "calidad_borde_1a5",
  "carbonizacion_1a5",
  "kwh_corrida_medido",
  "tiempo_real_corrida_s",
  "foto",
  "notas",
] as const;

export const COLUMNAS_REGISTRO = [...CAMPOS_CSV, ...COLUMNAS_MANUALES];

export type FilaRegistro = Record<(typeof COLUMNAS_REGISTRO)[number], string>;

/**
 * Valida una fila editada por el técnico, calcando el vocabulario del SOP
 * en papel del taller (docs/sop/SOP-corrida-de-prueba.md): "si"/"no" para
 * corte pasante, escalas 1-5 para calidad de borde y carbonización.
 */
const numeroPositivoOVacio = z
  .string()
  .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0), {
    message: "Tiene que ser un número mayor a 0.",
  });

/**
 * Valida una fila editada por el técnico, calcando el vocabulario del SOP
 * en papel del taller (docs/sop/SOP-corrida-de-prueba.md): "si"/"no" para
 * corte pasante, escalas 1-5 para calidad de borde y carbonización.
 * `kwh_corrida_medido` y `tiempo_real_corrida_s` viajan en cada fila (así se
 * guardan en el csv) pero deben ser el mismo valor en toda la corrida — esa
 * consistencia se valida aparte, con `filasComparten`.
 */
export const filaEditableSchema = z.object({
  corte_pasante: z.enum(["", "si", "no"]),
  calidad_borde_1a5: z.union([
    z.literal(""),
    z.enum(["1", "2", "3", "4", "5"]),
  ]),
  carbonizacion_1a5: z.union([
    z.literal(""),
    z.enum(["1", "2", "3", "4", "5"]),
  ]),
  kwh_corrida_medido: numeroPositivoOVacio,
  tiempo_real_corrida_s: numeroPositivoOVacio,
  foto: z.string(),
  notas: z.string(),
});

/** Espejo de `_valor_unico_de_grupo` en registro.py: una medición de la
 * corrida completa debe ser idéntica en todas sus filas. */
export function filasComparten(
  filas: { kwh_corrida_medido: string; tiempo_real_corrida_s: string }[],
): boolean {
  const kwh = new Set(filas.map((f) => f.kwh_corrida_medido));
  const tiempo = new Set(filas.map((f) => f.tiempo_real_corrida_s));
  return kwh.size <= 1 && tiempo.size <= 1;
}
