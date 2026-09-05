/** Codifica un SVG como data URI para mostrarlo con `<img>` — nunca inyectado
 * en el DOM, para que un SVG con `<script>` o atributos de evento no se
 * ejecute nunca (ver SvgOriginalPreview y SvgGaleria). */
export function svgADataUri(contenido: string): string {
  const codificado = encodeURIComponent(contenido)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${codificado}`;
}
