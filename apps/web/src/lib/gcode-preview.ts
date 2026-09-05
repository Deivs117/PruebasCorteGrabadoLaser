export interface SegmentoGcode {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** G0 = desplazamiento en vacío (láser apagado). G1 = corte/grabado real. */
  tipo: "desplazamiento" | "activo";
}

/**
 * Interpreta las coordenadas de un G-code GRBL ya generado, para dibujarlo
 * — no decide nada sobre velocidad/potencia/geometría (eso es exclusivo de
 * `laser_toolkit`), solo traduce G0/G1 a segmentos de línea. Asume
 * posicionamiento absoluto (G90) y milímetros (G21), que es lo único que
 * emite este sistema.
 */
export function parsearGcodeASegmentos(texto: string): SegmentoGcode[] {
  const segmentos: SegmentoGcode[] = [];
  let x = 0;
  let y = 0;

  for (const linea of texto.split("\n")) {
    const contenido = linea.split(";")[0]?.trim();
    if (!contenido) continue;

    const comando = /^(G0|G1)\b/.exec(contenido)?.[1];
    if (!comando) continue;

    const xMatch = /X(-?[\d.]+)/.exec(contenido);
    const yMatch = /Y(-?[\d.]+)/.exec(contenido);
    const xDestino = xMatch ? Number(xMatch[1]) : x;
    const yDestino = yMatch ? Number(yMatch[1]) : y;

    if (xMatch || yMatch) {
      segmentos.push({
        x1: x,
        y1: y,
        x2: xDestino,
        y2: yDestino,
        tipo: comando === "G0" ? "desplazamiento" : "activo",
      });
    }
    x = xDestino;
    y = yDestino;
  }

  return segmentos;
}
