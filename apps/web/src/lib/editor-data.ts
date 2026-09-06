import "server-only";

import { pyPost } from "@/lib/py-api";
import type { ObjetoExportar } from "@/lib/editor-export-schema";

export interface ResultadoExportarGcode {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Exportación combinada del Editor de Diseño (#3, cierre de #15/#16) --
 * espejo de `editor.exportar_gcode_combinado` en `apps/api`. Nunca devuelve
 * el G-code inline (puede pesar varios MB con un objeto raster grande, ver
 * #3): la respuesta trae un link de descarga firmado a Supabase Storage.
 */
export async function exportarGcodeCombinado(
  objetos: ObjetoExportar[],
): Promise<ResultadoExportarGcode> {
  try {
    const resultado = await pyPost<{ gcodeStorageKey: string; url: string }>(
      "editor/exportar",
      { objetos },
    );
    return { ok: true, url: resultado.url };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo exportar el G-code.",
    };
  }
}
