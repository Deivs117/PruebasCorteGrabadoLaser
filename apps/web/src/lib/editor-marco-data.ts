import "server-only";

import { pyPost } from "@/lib/py-api";
import type { MarcoCorteData } from "@/lib/editor-marco-schema";

export interface ResultadoMarcoCorte {
  ok: boolean;
  contenidoSvg?: string;
  tamanoMm?: number;
  dxMm?: number;
  dyMm?: number;
  error?: string;
}

/**
 * Marco de corte simple (círculo/cuadrado) centrado en el centro de masa
 * real del diseño (#196) -- espejo de `editor.calcular_marco_corte` en
 * `apps/api`. `dxMm`/`dyMm` es el desplazamiento (ya rotado) desde el centro
 * del objeto de origen hasta el centroide real -- quien llama solo necesita
 * sumarlo a `xMm`/`yMm` del objeto de origen para ubicar el nuevo objeto.
 */
export async function generarMarcoCorte(
  datos: MarcoCorteData,
): Promise<ResultadoMarcoCorte> {
  try {
    const resultado = await pyPost<{
      contenidoSvg: string;
      tamanoMm: number;
      dxMm: number;
      dyMm: number;
    }>("editor/marco-corte", datos);
    return { ok: true, ...resultado };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo generar el marco de corte.",
    };
  }
}
