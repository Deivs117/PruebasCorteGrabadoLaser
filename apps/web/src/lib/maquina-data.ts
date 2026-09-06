import "server-only";

import { pyGet, pyPut } from "@/lib/py-api";
import type { MaquinaFormData } from "@/lib/maquina-schema";

interface ConfiguracionMaquinaApi {
  laserMaxS: number;
  travelFeedMmMin: number;
  potenciaModuloW: number;
  factorUtilizacionLaser: number;
  puntoFocalMm: number;
  velocidadMaxMmMin: number;
  aceleracionMmS2: number;
  areaTrabajoAnchoMm: number;
  areaTrabajoAltoMm: number;
}

/**
 * Configuración de máquina (`configuracion_maquina` en Supabase, issue
 * #11/#22/#24), vía el servicio Python de #47/#48. A diferencia de tarifas,
 * el servicio nunca devuelve "vacío" -- la fila se crea con los defaults de
 * `MachineConfig` la primera vez.
 */
export async function leerMaquina(): Promise<MaquinaFormData> {
  const datos = await pyGet<ConfiguracionMaquinaApi>("maquina");
  return {
    laserMaxS: String(datos.laserMaxS),
    travelFeedMmMin: String(datos.travelFeedMmMin),
    potenciaModuloW: String(datos.potenciaModuloW),
    factorUtilizacionLaser: String(datos.factorUtilizacionLaser),
    puntoFocalMm: String(datos.puntoFocalMm),
    velocidadMaxMmMin: String(datos.velocidadMaxMmMin),
    aceleracionMmS2: String(datos.aceleracionMmS2),
    areaTrabajoAnchoMm: String(datos.areaTrabajoAnchoMm),
    areaTrabajoAltoMm: String(datos.areaTrabajoAltoMm),
  };
}

/**
 * Sobreescribe la fila única de `configuracion_maquina` -- pasa a ser el
 * default global real que usa todo el toolkit (issue #11), no un
 * pre-llenado del wizard.
 */
export async function guardarMaquina(datos: MaquinaFormData): Promise<void> {
  await pyPut<ConfiguracionMaquinaApi>("maquina", {
    laserMaxS: Number(datos.laserMaxS),
    travelFeedMmMin: Number(datos.travelFeedMmMin),
    potenciaModuloW: Number(datos.potenciaModuloW),
    factorUtilizacionLaser: Number(datos.factorUtilizacionLaser),
    puntoFocalMm: Number(datos.puntoFocalMm),
    velocidadMaxMmMin: Number(datos.velocidadMaxMmMin),
    aceleracionMmS2: Number(datos.aceleracionMmS2),
    areaTrabajoAnchoMm: Number(datos.areaTrabajoAnchoMm),
    areaTrabajoAltoMm: Number(datos.areaTrabajoAltoMm),
  });
}
