import { z } from "zod";

/**
 * Espejo en TypeScript de `SuiteConfig` (src/laser_toolkit/config.py). Las
 * mismas restricciones que valida pydantic del lado Python, para que el
 * formulario avise del error antes de llegar al servidor — pero la
 * validación real y definitiva sigue siendo la del CLI, no esta.
 */
export const suiteSchema = z.object({
  operacion: z.enum(["corte", "grabado"]),
  material: z.string().trim().min(1, "Ingresá el material."),
  espesorMm: z.number().gt(0, "El espesor debe ser mayor a 0."),
  lote: z.string().trim().min(1, "Ingresá un identificador de lote."),
  velocidadesMmMin: z
    .array(z.number().int().gt(0))
    .min(1, "Agregá al menos una velocidad."),
  potenciasPct: z
    .array(z.number().int().gt(0).lte(100))
    .min(1, "Agregá al menos una potencia."),
  pasadas: z.number().int().gte(1),
  tamanoCeldaMm: z.number().gt(0),
  espaciadoMm: z.number().gte(0),
});

export type SuiteFormData = z.infer<typeof suiteSchema>;

export const DEFAULTS: Omit<
  SuiteFormData,
  "operacion" | "material" | "espesorMm"
> = {
  lote: "L01",
  velocidadesMmMin: [],
  potenciasPct: [],
  pasadas: 1,
  tamanoCeldaMm: 15,
  espaciadoMm: 5,
};

/** "C" para corte, "G" para grabado — misma convención que las suites ya existentes. */
export function idPrefijo(operacion: "corte" | "grabado"): string {
  return operacion === "corte" ? "C" : "G";
}

export function totalCeldas(datos: {
  velocidadesMmMin: number[];
  potenciasPct: number[];
}): number {
  return datos.velocidadesMmMin.length * datos.potenciasPct.length;
}
