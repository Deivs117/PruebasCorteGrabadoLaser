import type { TotalPorMaterial } from "@/lib/reportes-data";

interface TotalesMaterialTablaProps {
  totales: TotalPorMaterial[];
}

function formatearDuracion(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.round((segundos % 3600) / 60);
  return horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
}

/** Totales acumulados (#209) por material Y operación (corte/grabado por
 * separado -- gastan tiempo/energía/espacio de forma muy distinta, mezclarlos
 * en una sola fila no sirve para planear) de TODAS las pruebas realizadas --
 * a diferencia de `CostoPromedioTabla` (promedio por combo), esto es una
 * suma histórica simple de tiempo/energía/espacio. Tiempo/energía usan la
 * medición real del medidor cuando existe y si no el estimado de respaldo,
 * para que ninguna prueba quede afuera del total solo por no tener Costeo
 * cargado -- "N° celdas" aclara cuántas son medición real. */
export function TotalesMaterialTabla({ totales }: TotalesMaterialTablaProps) {
  if (totales.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        Sin pruebas registradas todavía.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-text-muted border-border border-b text-xs uppercase">
            <th className="py-2 pr-4 font-medium">Material</th>
            <th className="py-2 pr-4 font-medium">Operación</th>
            <th className="py-2 pr-4 font-medium">Espacio ocupado</th>
            <th className="py-2 pr-4 font-medium">Tiempo de máquina</th>
            <th className="py-2 pr-4 font-medium">Energía</th>
            <th className="py-2 font-medium">N° celdas</th>
          </tr>
        </thead>
        <tbody>
          {totales.map((t) => (
            <tr
              key={`${t.material}-${t.operacion}`}
              className="border-border border-b last:border-0"
            >
              <td className="text-navy py-2 pr-4">{t.material}</td>
              <td className="text-navy py-2 pr-4 capitalize">{t.operacion}</td>
              <td className="text-navy py-2 pr-4 font-mono">
                {(Number(t.areaOcupadaMm2) / 100).toFixed(1)} cm²
              </td>
              <td className="text-navy py-2 pr-4 font-mono">
                {formatearDuracion(Number(t.tiempoS))}
              </td>
              <td className="text-navy py-2 pr-4 font-mono">
                {Number(t.kwhTotal).toFixed(3)} kWh
              </td>
              <td className="text-navy py-2 font-mono">
                {t.nCeldas}
                {t.nCeldasMedidas < t.nCeldas && (
                  <span className="text-text-muted">
                    {" "}
                    ({t.nCeldasMedidas} medidas, resto estimado)
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
