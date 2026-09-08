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

/** Bounding box combinado de varios objetos (#149, selección múltiple) — el
 * rectángulo mínimo que contiene los límites individuales de cada uno. `null`
 * con lista vacía: no hay caja que dibujar. Se usa para posicionar la barra
 * de acciones flotante y (potencialmente) el color del `Transformer` sobre
 * el conjunto seleccionado, igual que `limitesDe` ya hacía para un objeto. */
export function limitesUnionDe(objetos: ObjetoLienzo[]): LimitesObjeto | null {
  const [primero, ...resto] = objetos;
  if (!primero) return null;
  return resto.reduce<LimitesObjeto>((acumulado, objeto) => {
    const limites = limitesDe(objeto);
    return {
      minXMm: Math.min(acumulado.minXMm, limites.minXMm),
      maxXMm: Math.max(acumulado.maxXMm, limites.maxXMm),
      minYMm: Math.min(acumulado.minYMm, limites.minYMm),
      maxYMm: Math.max(acumulado.maxYMm, limites.maxYMm),
    };
  }, limitesDe(primero));
}

/** Caja alineada a los ejes, en "px de contenido" (mm × pxPorMm, SIN el
 * zoom/pan del `Stage`, igual espacio de coordenadas que usan los hijos del
 * `Layer` en `objeto-lienzo-konva.tsx`) — la usa el marquee de selección
 * (#149) para comparar el rectángulo que arrastra el mouse contra cada
 * objeto sin tener que convertir a mm en cada paso. */
export interface CajaPx {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function limitesEnPx(
  objeto: ObjetoLienzo,
  pxPorMm: number,
  areaTrabajoAltoMm: number,
): CajaPx {
  const limites = limitesDe(objeto);
  return {
    minX: limites.minXMm * pxPorMm,
    maxX: limites.maxXMm * pxPorMm,
    // Y se invierte: el toolkit mide desde abajo, Konva/canvas desde arriba
    // (mismo criterio que `aPx` en `objeto-lienzo-konva.tsx`).
    minY: (areaTrabajoAltoMm - limites.maxYMm) * pxPorMm,
    maxY: (areaTrabajoAltoMm - limites.minYMm) * pxPorMm,
  };
}

/** Intersección simple de dos cajas alineadas a los ejes (AABB) — el
 * marquee selecciona un objeto apenas su caja se toca con la del arrastre,
 * no hace falta que quede completamente adentro (mismo criterio permisivo
 * que la mayoría de editores tipo CAD/diseño). */
export function cajasSeIntersectan(a: CajaPx, b: CajaPx): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
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
