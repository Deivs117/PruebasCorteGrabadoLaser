import { Card } from "@/components/ui/card";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import type { CeldaCosteada } from "@/lib/registro-schema";

interface CostoTablaProps {
  filas: CeldaCosteada[];
  moneda: string;
}

function Costo({ valor, moneda }: { valor: string; moneda: string }) {
  if (valor === "") {
    return (
      <span
        className="text-orange inline-flex items-center gap-1 text-xs italic"
        title="Falta cargar la tarifa correspondiente en Tarifas."
      >
        <TriangleAlertAnimado className="size-3.5 shrink-0" />
        Sin tarifa
      </span>
    );
  }
  return (
    <span className="text-navy font-mono">
      {moneda} {Number(valor).toFixed(2)}
    </span>
  );
}

/** Costo real por celda, siempre con los tres componentes por separado — un
 * total solo aparece si los tres están disponibles (mismo criterio que
 * `costo_total` en costos.py, nunca subestima ocultando un pendiente). */
export function CostoTabla({ filas, moneda }: CostoTablaProps) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-border text-text-muted border-b text-xs uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Celda
            </th>
            <th scope="col" className="px-4 py-3">
              Velocidad
            </th>
            <th scope="col" className="px-4 py-3">
              Potencia
            </th>
            <th scope="col" className="px-4 py-3">
              Energía
            </th>
            <th scope="col" className="px-4 py-3">
              Material
            </th>
            <th scope="col" className="px-4 py-3">
              Tiempo máquina
            </th>
            <th scope="col" className="px-4 py-3">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {filas.map((fila) => (
            <tr key={fila.idPrueba}>
              <td className="text-navy px-4 py-3 font-mono">{fila.idPrueba}</td>
              <td className="text-navy px-4 py-3 font-mono">
                {fila.velocidadMmMin}
              </td>
              <td className="text-navy px-4 py-3 font-mono">
                {fila.potenciaPct}%
              </td>
              <td className="px-4 py-3">
                <Costo valor={fila.costoEnergiaCelda} moneda={moneda} />
              </td>
              <td className="px-4 py-3">
                <Costo valor={fila.costoMaterialCelda} moneda={moneda} />
              </td>
              <td className="px-4 py-3">
                <Costo valor={fila.costoTiempoMaquinaCelda} moneda={moneda} />
              </td>
              <td className="px-4 py-3 font-semibold">
                <Costo valor={fila.costoTotalCelda} moneda={moneda} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
