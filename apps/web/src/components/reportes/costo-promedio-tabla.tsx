import type { CostoPromedioCombo } from "@/lib/reportes-data";

interface CostoPromedioTablaProps {
  combos: CostoPromedioCombo[];
  moneda: string;
}

/** Tabla resumen exportable del Prompt 11 -- la misma fuente que alimenta
 * `ExportarCsvButton`, para que lo que se ve en pantalla sea exactamente lo
 * que se exporta. */
export function CostoPromedioTabla({
  combos,
  moneda,
}: CostoPromedioTablaProps) {
  if (combos.length === 0) {
    return (
      <p className="text-text-muted text-sm italic">
        Sin celdas costeadas todavía.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-text-muted border-border border-b text-xs uppercase">
            <th className="py-2 pr-4 font-medium">Material</th>
            <th className="py-2 pr-4 font-medium">Espesor</th>
            <th className="py-2 pr-4 font-medium">Operación</th>
            <th className="py-2 pr-4 font-medium">Costo promedio/celda</th>
            <th className="py-2 font-medium">N° celdas</th>
          </tr>
        </thead>
        <tbody>
          {combos.map((c) => (
            <tr
              key={`${c.material}-${c.espesorMm}-${c.operacion}`}
              className="border-border border-b last:border-0"
            >
              <td className="text-navy py-2 pr-4">{c.material}</td>
              <td className="text-navy py-2 pr-4 font-mono">{c.espesorMm}mm</td>
              <td className="text-navy py-2 pr-4 capitalize">{c.operacion}</td>
              <td className="text-navy py-2 pr-4 font-mono font-semibold">
                {moneda} {c.costoPromedioCelda}
              </td>
              <td className="text-navy py-2 font-mono">{c.nCeldas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
