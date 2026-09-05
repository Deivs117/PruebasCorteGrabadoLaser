/** Deja solo [a-z0-9-] — para que texto libre de un formulario nunca
 * termine siendo parte de una ruta de archivo insegura. */
export function slug(texto: string, largoMaximo = 40): string {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos ya separados por NFD
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, largoMaximo) || "sin-nombre"
  );
}
