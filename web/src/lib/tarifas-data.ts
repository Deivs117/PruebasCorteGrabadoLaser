import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { TARIFAS_PATH } from "@/lib/fs-data";
import type { TarifasFormData } from "@/lib/tarifas-schema";

interface TarifasYaml {
  moneda?: string;
  tarifa_electrica_por_kwh?: number | null;
  tarifa_hora_maquina?: number | null;
  precio_material_por_m2?: Record<string, number | null>;
}

/** Separa "<material>_<espesor>mm" de vuelta en sus dos partes, para
 * mostrarlas como campos independientes en el formulario. */
function separarClave(clave: string): { material: string; espesorMm: string } {
  const coincidencia = /^(.*)_(\d+(?:\.\d+)?)mm$/.exec(clave);
  if (!coincidencia) return { material: clave, espesorMm: "" };
  const [, material, espesorMm] = coincidencia;
  return { material: material ?? clave, espesorMm: espesorMm ?? "" };
}

export async function leerTarifas(): Promise<TarifasFormData> {
  try {
    const contenido = await readFile(TARIFAS_PATH, "utf-8");
    const datos = (parseYaml(contenido) ?? {}) as TarifasYaml;
    return {
      moneda: datos.moneda ?? "",
      tarifaElectricaPorKwh: datos.tarifa_electrica_por_kwh?.toString() ?? "",
      tarifaHoraMaquina: datos.tarifa_hora_maquina?.toString() ?? "",
      preciosMaterial: Object.entries(datos.precio_material_por_m2 ?? {}).map(
        ([clave, precio]) => ({
          ...separarClave(clave),
          precio: precio?.toString() ?? "",
        }),
      ),
    };
  } catch {
    return {
      moneda: "",
      tarifaElectricaPorKwh: "",
      tarifaHoraMaquina: "",
      preciosMaterial: [],
    };
  }
}

export async function guardarTarifas(datos: TarifasFormData): Promise<void> {
  const yaml: TarifasYaml = {
    moneda: datos.moneda,
    tarifa_electrica_por_kwh:
      datos.tarifaElectricaPorKwh === ""
        ? null
        : Number(datos.tarifaElectricaPorKwh),
    tarifa_hora_maquina:
      datos.tarifaHoraMaquina === "" ? null : Number(datos.tarifaHoraMaquina),
    precio_material_por_m2: Object.fromEntries(
      datos.preciosMaterial.map(({ material, espesorMm, precio }) => [
        `${material}_${Number(espesorMm)}mm`,
        precio === "" ? null : Number(precio),
      ]),
    ),
  };
  await writeFile(TARIFAS_PATH, stringifyYaml(yaml), "utf-8");
}
