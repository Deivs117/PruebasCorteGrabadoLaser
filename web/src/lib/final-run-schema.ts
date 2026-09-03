import { z } from "zod";

/** Espejo de `FinalRunConfig` (src/laser_toolkit/config.py). */
export const finalRunSchema = z.object({
  operacion: z.enum(["corte", "grabado"]),
  material: z.string().trim().min(1, "Ingresá el material."),
  espesorMm: z.number().gt(0, "El espesor debe ser mayor a 0."),
  lote: z.string().trim().min(1, "Ingresá un identificador de lote."),
  velocidadMmMin: z.number().int().gt(0, "La velocidad debe ser mayor a 0."),
  potenciaPct: z
    .number()
    .int()
    .gt(0)
    .lte(100, "La potencia debe estar entre 1 y 100."),
  pasadas: z.number().int().gte(1),
  repeticiones: z
    .number()
    .int()
    .gte(1, "Repetí la celda al menos una vez para poder medir algo."),
  tamanoCeldaMm: z.number().gt(0),
  espaciadoMm: z.number().gte(0),
});

export type FinalRunFormData = z.infer<typeof finalRunSchema>;

export const DEFAULTS_FINAL_RUN = {
  lote: "L01",
  pasadas: 1,
  repeticiones: 5,
  tamanoCeldaMm: 15,
  espaciadoMm: 5,
} as const;

export const MINIMO_EJECUCIONES = 3;
