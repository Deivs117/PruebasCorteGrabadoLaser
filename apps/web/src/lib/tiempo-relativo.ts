const FORMATO = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 24 * 365],
  ["month", 60 * 24 * 30],
  ["week", 60 * 24 * 7],
  ["day", 60 * 24],
  ["hour", 60],
  ["minute", 1],
];

/** "hace 3 días", "hace 2 horas", "ahora" — para que se pueda juzgar de un
 * vistazo si algo es reciente antes de eliminarlo. */
export function tiempoRelativo(fechaIso: string): string {
  const diffMinutos = (new Date(fechaIso).getTime() - Date.now()) / 60_000;

  for (const [unidad, minutosPorUnidad] of UNIDADES) {
    if (Math.abs(diffMinutos) >= minutosPorUnidad) {
      return FORMATO.format(Math.round(diffMinutos / minutosPorUnidad), unidad);
    }
  }
  return "ahora";
}
