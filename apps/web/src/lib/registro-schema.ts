import { z } from "zod";

const numeroPositivoOVacio = z
  .string()
  .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0), {
    message: "Tiene que ser un número mayor a 0.",
  });

/**
 * Hoja de Registro sobre Supabase (C, issue #60; generalizado a Final Run
 * en E, #64) -- `Registro`/`Medicion` normalizados (`apps/api/lectura.py`),
 * ya no un csv. Nombres de campo en camelCase, igual que el resto de los
 * contratos de #2.
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
