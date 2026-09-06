import type { ObjetoLienzo } from "@/lib/editor-tipos";

/** Caja alineada a los ejes que contiene un rectángulo `anchoMm x altoMm`
 * rotado `rotacionDeg` grados sobre su propio centro — la rotación agranda
 * la caja real que el objeto ocupa en la mesa (ej. un cuadrado a 45° ocupa
 * más que su lado). */
export function cajaRotada(
  anchoMm: number,
  altoMm: number,
  rotacionDeg: number,
): { anchoMm: number; altoMm: number } {
  const rad = (rotacionDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    anchoMm: anchoMm * cos + altoMm * sin,
    altoMm: anchoMm * sin + altoMm * cos,
  };
}

export interface LimitesObjeto {
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
}

export function limitesDe(objeto: ObjetoLienzo): LimitesObjeto {
  const caja = cajaRotada(objeto.anchoMm, objeto.altoMm, objeto.rotacionDeg);
  return {
    minXMm: objeto.xMm - caja.anchoMm / 2,
    maxXMm: objeto.xMm + caja.anchoMm / 2,
    minYMm: objeto.yMm - caja.altoMm / 2,
    maxYMm: objeto.yMm + caja.altoMm / 2,
  };
}

/** Si el objeto (ya rotado) cabe dentro del área de trabajo real de la
 * máquina — origen en la esquina inferior izquierda, igual que el resto del
 * toolkit (#11: `configuracion_maquina.area_trabajo_ancho_mm/alto_mm`). */
export function objetoExcedeArea(
  objeto: ObjetoLienzo,
  areaTrabajoAnchoMm: number,
  areaTrabajoAltoMm: number,
): boolean {
  const { minXMm, maxXMm, minYMm, maxYMm } = limitesDe(objeto);
  return (
    minXMm < 0 ||
    minYMm < 0 ||
    maxXMm > areaTrabajoAnchoMm ||
    maxYMm > areaTrabajoAltoMm
  );
}
