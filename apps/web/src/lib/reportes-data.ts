import "server-only";

import { pyGet } from "@/lib/py-api";

/**
 * Reportes (#13) -- detalle por material+espesor+operación puntual, a
 * diferencia de Historial (#12, panorama por familia sin filtros/export).
 * Espejo de `reportes_resumen` en `apps/api/lectura.py`.
 */
export interface CostoPromedioCombo {
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  /** "" nunca ocurre acá -- si no hay celdas costeadas, la combinación
   * directamente no aparece en la lista (ver backend). */
  costoPromedioCelda: string;
  nCeldas: number;
}

export interface PuntoSerieKwh {
  fecha: string;
  ejecucion: number;
  kwhPorUnidad: string;
}

export interface SerieKwhGrupo {
  grupoCalibracionId: string;
  material: string;
  espesorMm: string;
  operacion: "corte" | "grabado";
  velocidadMmMin: number;
  potenciaPct: number;
  puntos: PuntoSerieKwh[];
}

export interface TotalPorMaterial {
  material: string;
  /** Área acumulada de material consumida en TODAS las celdas (siempre
   * presente, generada automáticamente por la suite/final run). */
  areaMaterialMm2: string;
  /** Tiempo/energía reales acumulados -- solo cuentan las celdas ya
   * costeadas (`nCeldasCosteadas` puede ser menor que `nCeldas`). */
  tiempoMaquinaS: string;
  kwhTotal: string;
  nCeldas: number;
  nCeldasCosteadas: number;
}

export interface ReportesResumen {
  costoPromedioPorCombo: CostoPromedioCombo[];
  serieKwhCalibrado: SerieKwhGrupo[];
  totalesPorMaterial: TotalPorMaterial[];
  totales: {
    nCorridas: number;
    costoAcumulado: string;
  };
}

export async function leerReportes(): Promise<ReportesResumen> {
  return pyGet<ReportesResumen>("reportes");
}
