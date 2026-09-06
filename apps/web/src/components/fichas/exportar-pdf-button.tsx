"use client";

import { Button } from "@/components/ui/button";

/**
 * "Exportar a PDF" (issue #7) sin generación server-side: dispara la
 * impresión del navegador sobre el elemento marcado `data-ficha-imprimible`
 * (ver `FichaDocumento` y las reglas `@media print` de `globals.css`) --
 * el usuario elige "Guardar como PDF" del diálogo nativo. Evita agregar una
 * dependencia pesada y los límites de una función serverless (#2).
 */
export function ExportarPdfButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      Exportar a PDF
    </Button>
  );
}
