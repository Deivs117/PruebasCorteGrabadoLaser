import type { SerieKwhGrupo } from "@/lib/reportes-data";

const ANCHO = 480;
const ALTO = 140;
const PADDING = 28;

/**
 * Evolución de kWh/unidad calibrado en el tiempo, una Final Run por punto
 * (Prompt 11) -- una tarjeta con su propia línea por grupo de calibración
 * (material+espesor+operación+velocidad+potencia), en vez de superponer
 * series de escalas distintas en un solo gráfico.
 */
export function KwhEvolucionChart({ grupo }: { grupo: SerieKwhGrupo }) {
  const valores = grupo.puntos.map((p) => Number(p.kwhPorUnidad));
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;

  const coords = grupo.puntos.map((p, i) => {
    const x =
      grupo.puntos.length > 1
        ? PADDING + (i / (grupo.puntos.length - 1)) * (ANCHO - 2 * PADDING)
        : ANCHO / 2;
    const y =
      ALTO -
      PADDING -
      ((Number(p.kwhPorUnidad) - minimo) / rango) * (ALTO - 2 * PADDING);
    return { x, y, punto: p };
  });

  const linea = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div className="border-border rounded-[var(--radius-md)] border p-3">
      <p className="text-navy font-mono text-xs font-semibold">
        {grupo.material} {grupo.espesorMm}mm {grupo.operacion} —{" "}
        {grupo.velocidadMmMin}mm/min {grupo.potenciaPct}%
      </p>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={`Evolución de kWh por unidad, ${grupo.material}`}
      >
        <polyline
          points={linea}
          fill="none"
          stroke="var(--color-blue)"
          strokeWidth={2}
        />
        {coords.map((c) => (
          <circle
            key={`${c.punto.fecha}-${c.punto.ejecucion}`}
            cx={c.x}
            cy={c.y}
            r={3}
            fill="var(--color-blue)"
          />
        ))}
      </svg>
      <div className="text-text-muted flex justify-between font-mono text-[10px]">
        <span>{grupo.puntos[0]?.fecha}</span>
        <span>{grupo.puntos[grupo.puntos.length - 1]?.fecha}</span>
      </div>
    </div>
  );
}
