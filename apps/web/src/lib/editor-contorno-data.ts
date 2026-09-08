import "server-only";

import { pyPost } from "@/lib/py-api";
import type { ContornoCorteData } from "@/lib/editor-contorno-schema";

export interface ResultadoContornoCorte {
  ok: boolean;
  contenidoSvg?: string;
  anchoMm?: number;
  altoMm?: number;
  error?: string;
}

/**
 * Contorno de corte automático alrededor de una imagen (#108) -- espejo de
 * `editor.calcular_contorno_corte` en `apps/api`. El resultado ya viene
 * serializado como SVG (misma forma que `contenidoSvg` de un objeto
 * `tipo="svg"` del lienzo), listo para agregarse como objeto nuevo.
 */
export async function generarContornoCorte(
  datos: ContornoCorteData,
): Promise<ResultadoContornoCorte> {
  try {
    const resultado = await pyPost<{
      contenidoSvg: string;
      anchoMm: number;
      altoMm: number;
    }>("editor/contorno-corte", datos);
    return { ok: true, ...resultado };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo generar el contorno de corte.",
    };
  }
}
