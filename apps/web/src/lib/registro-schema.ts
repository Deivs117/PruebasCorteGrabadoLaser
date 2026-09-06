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

// Se eliminó "calidad_borde_1a5" (existía junto a "carbonizacion_1a5"): en la
// práctica del taller un corte o pasa limpio o no pasa, y si no pasa el borde
// ya queda mal por definición — "corte_pasante" cubre eso, sin una columna
// redundante.
export const COLUMNAS_MANUALES = [
  "corte_pasante",
  "carbonizacion_1a5",
  "kwh_corrida_medido",
  "tiempo_real_corrida_s",
  "foto",
  "notas",
] as const;

export const COLUMNAS_REGISTRO = [...CAMPOS_CSV, ...COLUMNAS_MANUALES];

export type FilaRegistro = Record<(typeof COLUMNAS_REGISTRO)[number], string>;

const numeroPositivoOVacio = z
  .string()
  .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0), {
    message: "Tiene que ser un número mayor a 0.",
  });

/**
 * Valida una fila editada por el técnico, calcando el vocabulario del SOP
 * en papel del taller (docs/sop/SOP-corrida-de-prueba.md): "si"/"no" para
 * corte pasante, escala 1-5 para carbonización.
 * `kwh_corrida_medido` y `tiempo_real_corrida_s` viajan en cada fila (así se
 * guardan en el csv) pero deben ser el mismo valor en toda la corrida — esa
 * consistencia se valida aparte, con `filasComparten`.
 */
export const filaEditableSchema = z.object({
  corte_pasante: z.enum(["", "si", "no"]),
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
 * corrida completa debe ser idéntica en todas sus filas. Solo la usa
 * `final-run-data.ts` (E, todavía 100% csv) -- en el modelo normalizado de
 * Suite/Registro (C, ver más abajo) esa consistencia la da el esquema, no
 * hace falta validarla en tiempo de lectura. */
export function filasComparten(
  filas: { kwh_corrida_medido: string; tiempo_real_corrida_s: string }[],
): boolean {
  const kwh = new Set(filas.map((f) => f.kwh_corrida_medido));
  const tiempo = new Set(filas.map((f) => f.tiempo_real_corrida_s));
  return kwh.size <= 1 && tiempo.size <= 1;
}

/**
 * Hoja de Registro sobre Supabase (C, issue #60) -- `Registro`/`Medicion`
 * normalizados (`apps/api/lectura.py`), no un csv. Nombres de campo en
 * camelCase (igual que el resto de los contratos de #2), a diferencia de
 * `FilaRegistro`/`FilaCosteada` de arriba, que siguen siendo el espejo
 * exacto de un csv real (Final Run, (E), todavía sin migrar).
 */
export interface CeldaRegistro {
  idPrueba: string;
  velocidadMmMin: string;
  potenciaPct: string;
  cortePasante: "" | "si" | "no";
  carbonizacion1a5: "" | "1" | "2" | "3" | "4" | "5";
  fotoStorageKey: string;
  notas: string;
}

export interface RegistroDetalle {
  corridaId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  lote: string;
  pasadas: number;
  kwhCorridaMedido: string;
  tiempoRealCorridaS: string;
  fotoBateriaStorageKey: string;
  celdas: CeldaRegistro[];
}

export const celdaEditableSchema = z.object({
  idPrueba: z.string().min(1),
  cortePasante: z.enum(["", "si", "no"]),
  carbonizacion1a5: z.union([z.literal(""), z.enum(["1", "2", "3", "4", "5"])]),
  notas: z.string(),
});

export const guardarRegistroSchema = z.object({
  kwhCorridaMedido: numeroPositivoOVacio,
  tiempoRealCorridaS: numeroPositivoOVacio,
  celdas: z.array(celdaEditableSchema).min(1),
});

export type GuardarRegistroPayload = z.infer<typeof guardarRegistroSchema>;

/** Costeo (C) sobre `Medicion` -- espejo de `lectura.costeo_detalle()`. */
export interface CeldaCosteada {
  idPrueba: string;
  velocidadMmMin: string;
  potenciaPct: string;
  costoEnergiaCelda: string;
  costoMaterialCelda: string;
  costoTiempoMaquinaCelda: string;
  costoTotalCelda: string;
}

export interface CosteoDetalle {
  corridaId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  lote: string;
  celdas: CeldaCosteada[];
}
