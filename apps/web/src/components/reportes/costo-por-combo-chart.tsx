import type { CostoPromedioCombo } from "@/lib/reportes-data";

interface CostoPorComboChartProps {
  combos: CostoPromedioCombo[];
  moneda: string;
}

const ALTO_BARRA_PX = 28;
const ANCHO_MAX_BARRA_PX = 260;
const VIEWBOX_ANCHO = 600;

/**
 * Costo promedio por material+espesor+operación (Prompt 11) -- barras
 * horizontales en SVG puro, sin librería de charts (mismo criterio que
 * `CostoHeatmap`: evitar una dependencia pesada para un gráfico simple).
 * Corte en azul, grabado en teal, como pide el prompt de diseño.
 */
export function CostoPorComboChart({
  combos,
  moneda,
}: CostoPorComboChartProps) {
  if (combos.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        Todavía no hay ninguna celda costeada -- este gráfico aparece apenas
        haya al menos una corrida con costeo calculado.
      </p>
    );
  }

  const maximo = Math.max(...combos.map((c) => Number(c.costoPromedioCelda)));
  const alto = combos.length * (ALTO_BARRA_PX + 8);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_ANCHO} ${alto}`}
      role="img"
      aria-label="Costo promedio por combinación de material, espesor y operación"
      className="w-full"
      style={{ height: alto }}
    >
      {combos.map((combo, i) => {
        const valor = Number(combo.costoPromedioCelda);
        const anchoBarra =
          maximo > 0 ? (valor / maximo) * ANCHO_MAX_BARRA_PX : 0;
        const y = i * (ALTO_BARRA_PX + 8);
        const color =
          combo.operacion === "corte"
            ? "var(--color-blue)"
            : "var(--color-teal)";
        return (
          <g key={`${combo.material}-${combo.espesorMm}-${combo.operacion}`}>
            <text
              x={0}
              y={y + ALTO_BARRA_PX / 2}
              dominantBaseline="middle"
              className="fill-navy font-mono text-[10px]"
            >
              {combo.material} {combo.espesorMm}mm {combo.operacion}
            </text>
            <rect
              x={165}
              y={y}
              width={anchoBarra}
              height={ALTO_BARRA_PX}
              rx={4}
              fill={color}
            />
            <text
              x={165 + anchoBarra + 6}
              y={y + ALTO_BARRA_PX / 2}
              dominantBaseline="middle"
              className="fill-navy font-mono text-[10px] font-semibold"
            >
              {moneda} {combo.costoPromedioCelda} ({combo.nCeldas} celdas)
            </text>
          </g>
        );
      })}
    </svg>
  );
}
