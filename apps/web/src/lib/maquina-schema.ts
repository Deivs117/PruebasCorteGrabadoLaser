import { z } from "zod";

/** Espejo de `MachineConfig` (config.py): a diferencia de tarifas, acá
 * ningún campo puede quedar vacío -- son constantes técnicas del
 * controlador GRBL, siempre tienen un valor real (issue #11). */
export interface MaquinaFormData {
  laserMaxS: string;
  travelFeedMmMin: string;
  potenciaModuloW: string;
  factorUtilizacionLaser: string;
  puntoFocalMm: string;
  velocidadMaxMmMin: string;
  aceleracionMmS2: string;
  areaTrabajoAnchoMm: string;
  areaTrabajoAltoMm: string;
}

const numeroPositivo = (mensaje: string) =>
  z.string().refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
    message: mensaje,
  });

const enteroPositivo = (mensaje: string) =>
  z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
    message: mensaje,
  });

export const maquinaSchema = z.object({
  laserMaxS: enteroPositivo(
    "Tiene que ser un entero mayor a 0 (parámetro $30 de GRBL).",
  ),
  travelFeedMmMin: enteroPositivo("Tiene que ser un entero mayor a 0."),
  potenciaModuloW: numeroPositivo("Tiene que ser un número mayor a 0."),
  factorUtilizacionLaser: numeroPositivo("Tiene que ser un número mayor a 0."),
  puntoFocalMm: numeroPositivo("Tiene que ser un número mayor a 0."),
  velocidadMaxMmMin: enteroPositivo(
    "Tiene que ser un entero mayor a 0 (parámetros $110/$111 de GRBL).",
  ),
  aceleracionMmS2: numeroPositivo(
    "Tiene que ser un número mayor a 0 (parámetros $120/$121 de GRBL).",
  ),
  areaTrabajoAnchoMm: numeroPositivo("Tiene que ser un número mayor a 0."),
  areaTrabajoAltoMm: numeroPositivo("Tiene que ser un número mayor a 0."),
});
