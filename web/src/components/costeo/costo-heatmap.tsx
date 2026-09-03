import { Card } from "@/components/ui/card";
import type { FilaCosteada } from "@/lib/registro-schema";

interface CostoHeatmapProps {
  filas: FilaCosteada[];
  moneda: string;
}

/** Mapa de calor velocidad×potencia por costo total: teal = más barato,
 * naranja = más caro. Una celda sin costo total (tarifa pendiente) se
 * marca aparte, nunca se le asigna un color como si tuviera dato. */
export function CostoHeatmap({ filas, moneda }: CostoHeatmapProps) {
  const velocidades = [...new Set(filas.map((f) => f.velocidad_mm_min))].sort(
    (a, b) => Number(a) - Number(b),
  );
  const potencias = [...new Set(filas.map((f) => f.potencia_pct))].sort(
    (a, b) => Number(a) - Number(b),
  );

  const valores = filas
    .map((f) => f.costo_total_celda)
    .filter((v) => v !== "")
    .map(Number);
  const minimo = valores.length > 0 ? Math.min(...valores) : 0;
  const maximo = valores.length > 0 ? Math.max(...valores) : 0;

  function celda(velocidad: string, potencia: string) {
    return filas.find(
      (f) => f.velocidad_mm_min === velocidad && f.potencia_pct === potencia,
    );
  }

  if (valores.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        Todavía no hay ningún costo total calculado para mostrar en el mapa de
        calor — faltan tarifas por cargar.
      </p>
    );
  }

  return (
    <Card className="overflow-x-auto p-4">
      <table className="mx-auto border-separate [border-spacing:0.375rem]">
        <caption className="text-text-muted pb-3 text-left text-sm">
          Filas = potencia (%), columnas = velocidad (mm/min). Color = costo
          total por celda ({moneda}).
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-hidden="true" />
            {velocidades.map((velocidad) => (
              <th
                key={velocidad}
                scope="col"
                className="text-text-muted pb-1 font-mono text-xs font-normal"
              >
                {velocidad}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {potencias.map((potencia) => (
            <tr key={potencia}>
              <th
                scope="row"
                className="text-text-muted pr-2 text-right font-mono text-xs font-normal"
              >
                {potencia}%
              </th>
              {velocidades.map((velocidad) => {
                const fila = celda(velocidad, potencia);
                const total = fila?.costo_total_celda;
                const tieneDato = total !== undefined && total !== "";
                const porcentaje =
                  tieneDato && maximo > minimo
                    ? ((Number(total) - minimo) / (maximo - minimo)) * 100
                    : 0;
                return (
                  <td key={velocidad}>
                    <div
                      className="border-border flex size-10 items-center justify-center rounded-[var(--radius-sm)] border"
                      style={
                        tieneDato
                          ? {
                              background: `color-mix(in srgb, var(--color-teal) ${100 - porcentaje}%, var(--color-orange) ${porcentaje}%)`,
                            }
                          : undefined
                      }
                      title={
                        fila
                          ? tieneDato
                            ? `${velocidad} mm/min · ${potencia}% — ${moneda} ${Number(total).toFixed(2)}`
                            : `${velocidad} mm/min · ${potencia}% — sin tarifa`
                          : undefined
                      }
                    >
                      {!tieneDato && fila ? (
                        <span
                          className="text-text-muted text-xs"
                          aria-hidden="true"
                        >
                          –
                        </span>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
