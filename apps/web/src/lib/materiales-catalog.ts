import "server-only";

import { pyGet, pyPost } from "@/lib/py-api";

/** Familia del material — decide qué ícono se usa para reconocerlo de un
 * vistazo en Suites de Prueba (madera/polímero/metal tienen formas de
 * trabajo y riesgos bien distintos). Se elige a mano al agregar el material
 * (ver MaterialSelect): adivinarla por el nombre sería frágil apenas
 * aparezca un material con un nombre que no anticipamos. */
export const FAMILIAS_MATERIAL = [
  "madera",
  "polimero",
  "metal",
  "otro",
] as const;
export type FamiliaMaterial = (typeof FAMILIAS_MATERIAL)[number];

export interface MaterialCatalogado {
  nombre: string;
  familia: FamiliaMaterial;
}

/**
 * Catálogo completo de materiales — issue #22/#24 (tabla `materiales` en
 * Supabase), vía el servicio Python de #47/#48. Antes se armaba combinando
 * `data/materiales-catalog.json` con lo que ya usaban las suites en
 * `configs/*.yaml`; ahora es una sola tabla, ya no hace falta unir dos
 * fuentes.
 */
export async function leerCatalogoMateriales(): Promise<MaterialCatalogado[]> {
  return pyGet<MaterialCatalogado[]>("materiales");
}

export interface ResultadoAgregarMaterial {
  ok: boolean;
  error?: string;
  catalogo?: MaterialCatalogado[];
}

/**
 * Agrega un material nuevo (con su familia) al catálogo, si no existe ya —
 * la deduplicación por mayúsculas/espacios y la validación de familia las
 * hace `agregar_material` del lado de Python (issue #49).
 */
export async function agregarMaterialCatalogo(
  nombre: string,
  familia: FamiliaMaterial,
): Promise<ResultadoAgregarMaterial> {
  try {
    const catalogo = await pyPost<MaterialCatalogado[]>("materiales", {
      nombre,
      familia,
    });
    return { ok: true, catalogo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al agregar el material.",
    };
  }
}
