import { z } from "zod";
import type { EstadoFicha } from "@/lib/final-run-data";

/** Campos editables de una Ficha de Parámetro Estándar (F6, issue #7).
 * `costoEstandarTotal`/`fechaValidacion` pueden quedar vacíos -- el toggle
 * rápido de Final Run ("Marcar Ficha como oficial") no los completa, y esta
 * pantalla los agrega recién cuando el área de calidad los defina. */
export interface FichaFormData {
  estado: EstadoFicha;
  costoEstandarTotal: string;
  fechaValidacion: string;
  notas: string;
}

export const fichaSchema = z.object({
  estado: z.enum(["oficial", "en_revision"] as const, {
    message: "Estado de ficha inválido.",
  }),
  notas: z.string().trim().optional(),
  costoEstandarTotal: z
    .string()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0), {
      message: "El costo estándar tiene que ser un número mayor a 0.",
    })
    .optional(),
  fechaValidacion: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "La fecha de validación tiene que tener formato AAAA-MM-DD.",
    })
    .optional(),
});
