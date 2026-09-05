import { Card } from "@/components/ui/card";

interface GridPreviewProps {
  velocidadesMmMin: number[];
  potenciasPct: number[];
}

/**
 * Vista previa de la grilla de la suite: cada combinación velocidad×potencia
 * es una celda real que la máquina va a cortar/grabar. Es una tabla
 * verdadera (filas Y columnas se corresponden entre sí), no un grid visual
 * decorativo.
 */
export function GridPreview({
  velocidadesMmMin,
  potenciasPct,
}: GridPreviewProps) {
  if (velocidadesMmMin.length === 0 || potenciasPct.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        Agregá al menos una velocidad y una potencia para ver la grilla.
      </p>
    );
  }

  return (
    <Card className="overflow-x-auto p-4">
      <table className="mx-auto border-separate [border-spacing:0.375rem]">
        <caption className="text-text-muted pb-3 text-left text-sm">
          Filas = potencia (%), columnas = velocidad (mm/min). Cada celda es una
          combinación que se va a cortar/grabar por separado.
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-hidden="true" />
            {velocidadesMmMin.map((velocidad) => (
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
          {potenciasPct.map((potencia) => (
            <tr key={potencia}>
              <th
                scope="row"
                className="text-text-muted pr-2 text-right font-mono text-xs font-normal"
              >
                {potencia}%
              </th>
              {velocidadesMmMin.map((velocidad) => (
                <td key={velocidad}>
                  <div
                    className="bg-blue-soft border-blue/30 size-8 rounded-[var(--radius-sm)] border"
                    aria-hidden="true"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
