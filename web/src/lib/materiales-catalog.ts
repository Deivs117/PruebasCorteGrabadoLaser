import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT, listarSuites } from "@/lib/fs-data";

const RUTA = path.join(REPO_ROOT, "data", "materiales-catalog.json");

/** Familia del material — decide qué ícono se usa para reconocerlo de un
 * vistazo en Suites de Prueba (madera/polímero/metal tienen formas de
 * trabajo y riesgos bien distintos). Se elige a mano al agregar el material
 * (ver MaterialSelect): adivinarla por el nombre sería frágil apenas
 * aparezca un material con un nombre que no anticipamos. */
export const FAMILIAS_MATERIAL = ["madera", "polimero", "metal", "otro"] as const;
export type FamiliaMaterial = (typeof FAMILIAS_MATERIAL)[number];

export interface MaterialCatalogado {
  nombre: string;
  familia: FamiliaMaterial;
}

function esFamiliaValida(valor: unknown): valor is FamiliaMaterial {
  return (
    typeof valor === "string" &&
    (FAMILIAS_MATERIAL as readonly string[]).includes(valor)
  );
}

/**
 * Materiales que el técnico agregó a mano desde el wizard (ej. antes de la
 * primera suite de un material nuevo, como "Polímero X"). Se combinan con
 * los materiales que ya aparecen en configs/*.yaml, para que el catálogo
 * siempre muestre todo lo que existe, no solo lo agregado explícitamente —
 * esos últimos, al no tener familia elegida a mano, quedan como "otro".
 */
async function leerAgregados(): Promise<MaterialCatalogado[]> {
  try {
    const contenido = await readFile(RUTA, "utf-8");
    const datos: unknown = JSON.parse(contenido);
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (d): d is MaterialCatalogado =>
        typeof d === "object" &&
        d !== null &&
        typeof (d as MaterialCatalogado).nombre === "string" &&
        esFamiliaValida((d as MaterialCatalogado).familia),
    );
  } catch {
    return [];
  }
}

async function guardarAgregados(materiales: MaterialCatalogado[]): Promise<void> {
  await writeFile(RUTA, JSON.stringify(materiales, null, 2), "utf-8");
}

/** Une catálogos sin duplicar por nombre (sin distinguir mayúsculas/espacios),
 * dando prioridad a la familia ya elegida a mano sobre el "otro" por defecto. */
function unirSinDuplicados(
  ...listas: MaterialCatalogado[][]
): MaterialCatalogado[] {
  const vistos = new Map<string, MaterialCatalogado>();
  for (const lista of listas) {
    for (const item of lista) {
      const nombre = item.nombre.trim();
      if (nombre === "") continue;
      const clave = nombre.toLowerCase();
      const existente = vistos.get(clave);
      if (!existente || (existente.familia === "otro" && item.familia !== "otro")) {
        vistos.set(clave, { nombre, familia: item.familia });
      }
    }
  }
  return [...vistos.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

/** Catálogo completo: lo agregado a mano (con su familia) + lo que ya usan
 * las suites configuradas hoy (con familia "otro", hasta que alguien la
 * elija explícitamente). */
export async function leerCatalogoMateriales(): Promise<MaterialCatalogado[]> {
  const [agregados, suites] = await Promise.all([
    leerAgregados(),
    listarSuites(),
  ]);
  return unirSinDuplicados(
    agregados,
    suites.map((s) => ({ nombre: s.material, familia: "otro" as const })),
  );
}

export interface ResultadoAgregarMaterial {
  ok: boolean;
  error?: string;
  catalogo?: MaterialCatalogado[];
}

/** Agrega un material nuevo (con su familia) al catálogo persistido, si no
 * existe ya en ninguna de las dos fuentes — nunca duplica por
 * mayúsculas/espacios. */
export async function agregarMaterialCatalogo(
  nombre: string,
  familia: FamiliaMaterial,
): Promise<ResultadoAgregarMaterial> {
  const limpio = nombre.trim();
  if (limpio === "") {
    return { ok: false, error: "El nombre del material no puede estar vacío." };
  }
  if (limpio.length > 60) {
    return { ok: false, error: "El nombre del material es demasiado largo." };
  }
  if (!esFamiliaValida(familia)) {
    return { ok: false, error: "Elegí una familia de material válida." };
  }

  const actual = await leerCatalogoMateriales();
  if (actual.some((m) => m.nombre.toLowerCase() === limpio.toLowerCase())) {
    return { ok: true, catalogo: actual };
  }

  const agregados = await leerAgregados();
  await guardarAgregados([...agregados, { nombre: limpio, familia }]);

  return { ok: true, catalogo: unirSinDuplicados(actual, [{ nombre: limpio, familia }]) };
}
