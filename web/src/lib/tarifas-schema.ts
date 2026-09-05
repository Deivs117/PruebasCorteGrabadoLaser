import { z } from "zod";

/** Espejo de `clave_material` en tarifas.py: "<material>_<espesor>mm",
 * con el mismo formato numérico que Python (`:g`, sin ceros de más). */
export function claveMaterial(material: string, espesorMm: number): string {
  return `${material}_${espesorMm}mm`;
}

export interface PrecioMaterialForm {
  material: string;
  espesorMm: string;
  precio: string;
}

export interface TarifasFormData {
  moneda: string;
  tarifaElectricaPorKwh: string;
  tarifaHoraMaquina: string;
  preciosMaterial: PrecioMaterialForm[];
}

const numeroPositivoOVacio = z
  .string()
  .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) > 0), {
    message: "Tiene que ser un número mayor a 0.",
  });

/** Espejo de `TarifasConfig` (tarifas.py): cualquier campo puede quedar
 * vacío mientras el área financiera no lo defina — nunca se completa solo. */
export const tarifasSchema = z.object({
  moneda: z.string().trim().min(1, "Ingresá la moneda (ej. COP, MXN, USD)."),
  tarifaElectricaPorKwh: numeroPositivoOVacio,
  tarifaHoraMaquina: numeroPositivoOVacio,
  preciosMaterial: z.array(
    z.object({
      material: z.string().trim().min(1, "Ingresá el material."),
      espesorMm: z
        .string()
        .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
          message: "El espesor debe ser mayor a 0.",
        }),
      precio: numeroPositivoOVacio,
    }),
  ),
});
