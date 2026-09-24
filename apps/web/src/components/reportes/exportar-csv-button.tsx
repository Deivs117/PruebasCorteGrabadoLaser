"use client";

import { Button } from "@/components/ui/button";
import { DownloadAnimado } from "@/components/ui/icons/download-animado";
import { guardarBlobComoArchivo } from "@/lib/descargar-archivo";
import type { CostoPromedioCombo, TotalPorMaterial } from "@/lib/reportes-data";

interface ExportarCsvButtonProps {
  combos: CostoPromedioCombo[];
  totalesPorMaterial: TotalPorMaterial[];
}

/** Escapa una celda para CSV (RFC 4180) -- comillas dobles si el valor trae
 * coma, comilla o salto de línea. Sin librería: la tabla es chica y el
 * formato es simple, no vale la pena la dependencia (mismo criterio que
 * `ExportarPdfButton`, que evita una librería de PDF con `window.print`). */
function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * "Exportar a Excel" del Prompt 11 -- CSV, que Excel abre nativamente. Dos
 * tablas exportables en el mismo archivo (separadas por línea en blanco,
 * Excel las abre igual en una sola hoja): costo promedio por combinación y,
 * desde #209, totales acumulados por material. La serie de kWh en el
 * tiempo es para lectura visual, no para exportar fila por fila acá.
 */
export function ExportarCsvButton({
  combos,
  totalesPorMaterial,
}: ExportarCsvButtonProps) {
  async function exportar() {
    const tablaCombos = [
      [
        "Material",
        "Espesor (mm)",
        "Operación",
        "Costo promedio por celda",
        "N° celdas",
      ],
      ...combos.map((c) => [
        c.material,
        c.espesorMm,
        c.operacion,
        c.costoPromedioCelda,
        c.nCeldas,
      ]),
    ];
    const tablaTotales = [
      [
        "Material",
        "Operación",
        "Espacio ocupado (mm²)",
        "Tiempo (s)",
        "Energía (kWh)",
        "N° celdas",
        "N° celdas con medición real (resto estimado)",
      ],
      ...totalesPorMaterial.map((t) => [
        t.material,
        t.operacion,
        t.areaOcupadaMm2,
        t.tiempoS,
        t.kwhTotal,
        t.nCeldas,
        t.nCeldasMedidas,
      ]),
    ];
    const csv = [...tablaCombos, [], ...tablaTotales]
      .map((fila) => fila.map(celdaCsv).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    await guardarBlobComoArchivo(blob, "reportes.csv");
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportar}
      disabled={combos.length === 0 && totalesPorMaterial.length === 0}
    >
      <DownloadAnimado className="size-4" strokeWidth={1.75} />
      Exportar a Excel (CSV)
    </Button>
  );
}
