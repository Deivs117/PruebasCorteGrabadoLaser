/** Sugiere un lote distinto al actual para "Duplicar suite" — incrementa el
 * número final (L01 -> L02) o, si no hay uno, agrega un sufijo. Es solo una
 * sugerencia editable: la validación real de que no choca con una corrida ya
 * generada pasa en el servidor al guardar. */
export function loteSiguiente(loteActual: string): string {
  const actual = loteActual.trim();
  const match = /^(.*?)(\d+)$/.exec(actual);
  const prefijo = match?.[1];
  const numero = match?.[2];
  if (prefijo === undefined || numero === undefined) {
    return actual ? `${actual}-2` : "L02";
  }
  const siguiente = (Number(numero) + 1).toString().padStart(numero.length, "0");
  return `${prefijo}${siguiente}`;
}
