import type { CardAccent } from "@/components/ui/card";

// Mismos 4 acentos que ya usa el resto de la app (Card, badges) — así el
// cuadradito de un material nunca introduce un color fuera de la paleta.
const PALETA: CardAccent[] = ["blue", "teal", "orange", "purple"];

/** Color estable para un material, calculado a partir de su nombre — el
 * mismo nombre siempre cae en el mismo color, sin necesidad de guardar nada:
 * es una identidad visual, no una clasificación (para eso está la familia). */
export function colorDeMaterial(nombre: string): CardAccent {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
  }
  const indice = Math.abs(hash) % PALETA.length;
  return PALETA[indice] ?? "navy";
}
