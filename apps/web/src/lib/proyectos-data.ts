import "server-only";

import { pyDelete, pyGet, pyPost, pyPut } from "@/lib/py-api";
import type { GuardarProyectoData } from "@/lib/proyecto-schema";
import type { ObjetoLienzo } from "@/lib/editor-tipos";

/** Espejo de `_resumen()` en `apps/api/proyectos.py` -- lo que trae `GET
 * /proyectos` (listado) y la cabecera de `GET /proyectos/{id}` (detalle). */
export interface ProyectoResumen {
  id: number;
  nombre: string;
  materialId: number | null;
  material: string | null;
  fichaParametroId: number | null;
  cantidadObjetos: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExportacionProyecto {
  gcodeStorageKey: string;
  url: string;
  exportadoEn: string;
}

/** Espejo de `detalle()` en `apps/api/proyectos.py` -- `objetos` ya viene
 * con el contenido real reconstruido (`contenidoSvg`/`dataUri`), lista para
 * usarse tal cual como `ObjetoLienzo` en el lienzo del Editor. */
export interface ProyectoDetalle extends ProyectoResumen {
  objetos: ObjetoLienzo[];
  exportaciones: ExportacionProyecto[];
}

export interface ResultadoGuardarProyecto {
  ok: boolean;
  id?: number;
  error?: string;
}

export async function listarProyectos(): Promise<ProyectoResumen[]> {
  return pyGet<ProyectoResumen[]>("proyectos");
}

/** `null` si no existe o el servicio Python no responde -- mismo criterio
 * que `leerSuiteParaFormulario` en `generar-suite.ts`. */
export async function obtenerProyecto(
  id: number,
): Promise<ProyectoDetalle | null> {
  try {
    return await pyGet<ProyectoDetalle>(`proyectos/${id}`);
  } catch {
    return null;
  }
}

export async function crearProyecto(
  datos: GuardarProyectoData,
): Promise<ResultadoGuardarProyecto> {
  try {
    const resultado = await pyPost<{ id: number }>("proyectos", datos);
    return { ok: true, id: resultado.id };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar el proyecto.",
    };
  }
}

export async function actualizarProyecto(
  id: number,
  datos: GuardarProyectoData,
): Promise<ResultadoGuardarProyecto> {
  try {
    const resultado = await pyPut<{ id: number }>(`proyectos/${id}`, datos);
    return { ok: true, id: resultado.id };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios del proyecto.",
    };
  }
}

export async function eliminarProyectoPorId(id: number): Promise<boolean> {
  try {
    await pyDelete(`proyectos/${id}`);
    return true;
  } catch {
    return false;
  }
}
