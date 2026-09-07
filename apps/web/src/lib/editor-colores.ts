import type { ObjetoLienzo, Operacion } from "@/lib/editor-tipos";

/**
 * Categoría visual de una operación (#107): el pedido es diferenciar color
 * no solo entre Corte y Grabado sino, dentro del grabado, entre el relleno
 * vectorial de un SVG ("sólido", franjas limpias) y el tramado de una
 * imagen raster ("fotorrealista", medios tonos) -- el modelo de datos
 * (`editor-tipos.ts`) no tiene ese matiz como campo propio todavía, así que
 * se deriva de `objeto.tipo` en el momento de pintar, no se persiste.
 */
export type CategoriaOperacion =
  "corte" | "grabado_solido" | "grabado_fotorrealista";

export function categoriaDeOperacion(
  objeto: ObjetoLienzo,
  operacion: Operacion,
): CategoriaOperacion {
  if (operacion === "corte") return "corte";
  return objeto.tipo === "svg" ? "grabado_solido" : "grabado_fotorrealista";
}

/** Mismos valores que `--color-blue`/`--color-teal`/`--color-purple` de
 * `globals.css`, hardcodeados a propósito -- Konva dibuja sobre un
 * `<canvas>` real y no puede leer variables CSS, igual que ya hace el resto
 * del lienzo (ver los colores fijos en `objeto-lienzo-konva.tsx`). */
export const COLOR_POR_CATEGORIA: Record<CategoriaOperacion, string> = {
  corte: "#246bce",
  grabado_solido: "#1fc1b1",
  grabado_fotorrealista: "#e056fd",
};

export const ETIQUETA_POR_CATEGORIA: Record<CategoriaOperacion, string> = {
  corte: "Corte",
  grabado_solido: "Grabado sólido",
  grabado_fotorrealista: "Grabado fotorrealista",
};

/** Clases de Tailwind (con los mismos tokens) para las píldoras del panel
 * numérico -- ahí sí se puede usar CSS normal en vez de colores fijos. */
export const CLASES_ACTIVAS_POR_CATEGORIA: Record<CategoriaOperacion, string> =
  {
    corte: "border-blue bg-blue-soft text-navy",
    grabado_solido: "border-teal bg-teal-soft text-navy",
    grabado_fotorrealista: "border-purple bg-purple-soft text-navy",
  };

/** Color del borde de selección de un objeto en el lienzo. Un objeto puede
 * pedir corte y grabado a la vez -- en ese caso el corte manda porque ya
 * era, antes de #107, el que definía visualmente el contorno de selección;
 * resignificar ese borde hubiera sido más disruptivo que priorizarlo. */
export function colorSeleccionDe(objeto: ObjetoLienzo): string {
  const categoria = objeto.operaciones.includes("corte")
    ? "corte"
    : categoriaDeOperacion(objeto, "grabado");
  return COLOR_POR_CATEGORIA[categoria];
}
