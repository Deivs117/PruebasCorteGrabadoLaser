import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";
import { pyGet, pyPost } from "@/lib/py-api";
import { listarSuites, REPO_ROOT, type Operacion } from "@/lib/fs-data";

export type { Operacion };

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

const MATERIALES_DOCS_DIR = path.join(REPO_ROOT, "docs", "materiales");

export interface ArchivoFichaTecnica {
  nombre: string;
  /** Ruta relativa a la raíz del repo, para armar el link a GitHub (ver
   * `MaterialDrawer` — mismo patrón que ya usa `/ayuda` para el SOP). */
  rutaRelativa: string;
}

/**
 * Busca `docs/materiales/<material>/*.md` (case-insensitive, coincidencia
 * exacta del nombre de carpeta con el material) — issue #10: "enlazar el
 * doc existente... como ya pasa con MDF". Esa carpeta se borró en la
 * limpieza de docs del 2026-09-06 (contenido teórico contradicho por datos
 * reales) y hoy no existe para ningún material, así que esto siempre
 * devuelve `[]` por ahora — queda listo para el día que se publique una
 * ficha real ahí, sin tocar el código de nuevo. Nunca lanza: si la carpeta
 * no existe, es "sin ficha técnica todavía", no un error.
 */
export async function leerFichaTecnica(
  material: string,
): Promise<ArchivoFichaTecnica[]> {
  let carpetas: string[];
  try {
    carpetas = await readdir(MATERIALES_DOCS_DIR);
  } catch {
    return [];
  }

  const carpeta = carpetas.find(
    (c) => c.toLowerCase() === material.toLowerCase(),
  );
  if (!carpeta) return [];

  try {
    const archivos = await readdir(path.join(MATERIALES_DOCS_DIR, carpeta));
    return archivos
      .filter((a) => a.toLowerCase().endsWith(".md"))
      .map((nombre) => ({
        nombre,
        rutaRelativa: `docs/materiales/${carpeta}/${nombre}`,
      }));
  } catch {
    return [];
  }
}

export interface MaterialResumen extends MaterialCatalogado {
  /** mm, únicos y ordenados ascendente — derivado de las suites existentes,
   * nunca cargado a mano (decisión de #10). */
  espesoresMm: number[];
  /** Qué operaciones ya tienen al menos una suite para este material —
   * subconjunto de `["corte", "grabado"]`, puede estar vacío si el material
   * está en el catálogo pero todavía no se corrió ninguna prueba con él. */
  operaciones: Operacion[];
  fichaTecnica: ArchivoFichaTecnica[];
}

/**
 * Catálogo de materiales enriquecido con lo que ya se sabe de ellos por las
 * suites reales (issue #10) — nunca una segunda fuente de verdad: espesores
 * y operaciones se recalculan en cada lectura a partir de `listarSuites()`,
 * no se guardan en ningún lado.
 */
export async function listarMaterialesConDatos(): Promise<MaterialResumen[]> {
  const [catalogo, suites] = await Promise.all([
    leerCatalogoMateriales(),
    listarSuites(),
  ]);

  const derivadoPorMaterial = new Map<
    string,
    { espesores: Set<number>; operaciones: Set<Operacion> }
  >();
  for (const suite of suites) {
    const clave = suite.material.toLowerCase();
    const derivado = derivadoPorMaterial.get(clave) ?? {
      espesores: new Set<number>(),
      operaciones: new Set<Operacion>(),
    };
    derivado.espesores.add(suite.espesorMm);
    derivado.operaciones.add(suite.operacion);
    derivadoPorMaterial.set(clave, derivado);
  }

  // Un material puede tener suites pero, por lo que sea, no estar en el
  // catálogo (no debería pasar en el flujo normal, pero nunca se debe
  // ocultar una corrida real por esto) — se agrega igual, con familia
  // "otro" como fallback honesto.
  const nombresCatalogo = new Set(catalogo.map((m) => m.nombre.toLowerCase()));
  const catalogoCompleto: MaterialCatalogado[] = [...catalogo];
  for (const suite of suites) {
    if (!nombresCatalogo.has(suite.material.toLowerCase())) {
      nombresCatalogo.add(suite.material.toLowerCase());
      catalogoCompleto.push({ nombre: suite.material, familia: "otro" });
    }
  }

  return Promise.all(
    catalogoCompleto.map(async (material) => {
      const derivado = derivadoPorMaterial.get(material.nombre.toLowerCase());
      return {
        ...material,
        espesoresMm: [...(derivado?.espesores ?? [])].sort((a, b) => a - b),
        operaciones: [...(derivado?.operaciones ?? [])].sort(),
        fichaTecnica: await leerFichaTecnica(material.nombre),
      };
    }),
  );
}
