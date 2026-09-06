import "server-only";

import { pyGet, pyPut } from "@/lib/py-api";
import type { TarifasFormData } from "@/lib/tarifas-schema";

/**
 * Tarifas vigentes (`tarifas_historial` + `precios_material` en Supabase,
 * issue #22/#24), vía el servicio Python de #47/#48. `configs/tarifas.yaml`
 * ya no es la fuente de verdad.
 */
export async function leerTarifas(): Promise<TarifasFormData> {
  return pyGet<TarifasFormData>("tarifas");
}

/**
 * Guarda una tarifa nueva (`tarifas_historial` es de solo inserción — cada
 * guardado agrega una fila al historial, ver `registrar_tarifas` en Python)
 * y actualiza los precios por material/espesor.
 */
export async function guardarTarifas(datos: TarifasFormData): Promise<void> {
  await pyPut<TarifasFormData>("tarifas", datos);
}
