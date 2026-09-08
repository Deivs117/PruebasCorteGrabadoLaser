/**
 * Geometría de navegación del lienzo (#107): todo lo que necesitan la
 * grilla, las reglas y la barra de acciones flotante para traducir entre
 * milímetros del área de trabajo y píxeles de pantalla, dados el zoom y el
 * pan actuales del `Stage` de Konva. Mismo sistema de coordenadas que
 * `objeto-lienzo-konva.tsx` (Y invertida: el toolkit mide desde abajo,
 * Konva/canvas desde arriba).
 */

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 6;
/** Factor de cambio por "click" de la rueda o de los botones +/-. */
export const ZOOM_PASO = 1.15;

/** Ancho fijo, en píxeles de pantalla (no en mm), de las bandas de regla en
 * los bordes superior e izquierdo -- no escala con el zoom, como en
 * cualquier CAD real: la banda siempre tiene el mismo tamaño, lo que cambia
 * es cuántos milímetros entran en ella. */
export const MARGEN_REGLA_PX = 22;

export function limitarZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export interface VistaLienzo {
  /** px por mm "de base" (antes de zoom) -- el mismo que ya usaba el
   * lienzo pre-#107, derivado del ancho real del contenedor. */
  pxPorMm: number;
  zoom: number;
  /** Posición (px de pantalla) del punto de contenido (0,0) -- ya incluye
   * el corrimiento por `MARGEN_REGLA_PX` de las reglas. */
  panX: number;
  panY: number;
  areaTrabajoAltoMm: number;
}

export function xMmAPantalla(xMm: number, vista: VistaLienzo): number {
  return vista.panX + xMm * vista.pxPorMm * vista.zoom;
}

export function yMmAPantalla(yMm: number, vista: VistaLienzo): number {
  return (
    vista.panY + (vista.areaTrabajoAltoMm - yMm) * vista.pxPorMm * vista.zoom
  );
}

/** Inversa de `xMmAPantalla`/`yMmAPantalla` -- usada al hacer zoom con la
 * rueda del mouse para mantener fijo el punto bajo el cursor. */
export function pantallaAMm(
  pantallaX: number,
  pantallaY: number,
  vista: VistaLienzo,
): { xMm: number; yMm: number } {
  const escala = vista.pxPorMm * vista.zoom;
  return {
    xMm: (pantallaX - vista.panX) / escala,
    yMm: vista.areaTrabajoAltoMm - (pantallaY - vista.panY) / escala,
  };
}

/** Paso de la grilla/reglas en mm según qué tan ampliado esté el lienzo:
 * se afina de 10mm a 1mm al hacer zoom in (#107), para que las líneas nunca
 * se vean imposiblemente juntas ni inútilmente separadas. `escalaPxPorMm`
 * ya tiene el zoom aplicado (`pxPorMm * zoom`). */
export function pasoGrillaMm(escalaPxPorMm: number): number {
  if (escalaPxPorMm >= 20) return 1;
  if (escalaPxPorMm >= 8) return 2;
  if (escalaPxPorMm >= 3) return 5;
  return 10;
}
