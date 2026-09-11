import { z } from "zod";
import type { EstadoFicha } from "@/lib/final-run-data";

/** Campos editables de una Ficha de Parámetro Estándar (F6, issue #7).
 * `fechaValidacion` puede quedar vacía -- el toggle rápido de Final Run
 * ("Marcar Ficha como oficial") no la completa, y esta pantalla la agrega
 * recién cuando el área de calidad la defina.
 *
 * El costo (por mm cortado o mm² grabado) NO es un campo editable acá
 * (issue #170) -- se calcula solo a partir de las tarifas + lo calibrado en
 * la Final Run, ver `regenerarCostosFicha` en `final-run-data.ts`. */
export interface FichaFormData {
  estado: EstadoFicha;
  fechaValidacion: string;
  notas: string;
}

export const fichaSchema = z.object({
  estado: z.enum(["oficial", "en_revision"] as const, {
    message: "Estado de ficha inválido.",
  }),
  notas: z.string().trim().optional(),
  fechaValidacion: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "La fecha de validación tiene que tener formato AAAA-MM-DD.",
    })
    .optional(),
});
