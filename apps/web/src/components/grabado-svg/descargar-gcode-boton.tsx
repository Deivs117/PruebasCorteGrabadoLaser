"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadAnimado } from "@/components/ui/icons/download-animado";
import { guardarBlobComoArchivo } from "@/lib/descargar-archivo";

interface DescargarGcodeBotonProps {
  gcode: string;
  nombreArchivo: string;
}

/** Descarga el G-code ya generado por la vista previa (#3) -- a diferencia
 * de `DescargarBoton`, no hace un round-trip al servidor: el contenido ya
 * está en memoria (`convertirSvg` lo devuelve inline), así que arma el Blob
 * directo en el cliente. */
export function DescargarGcodeBoton({
  gcode,
  nombreArchivo,
}: DescargarGcodeBotonProps) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(false);

  async function descargar() {
    setDescargando(true);
    setError(false);
    try {
      const blob = new Blob([gcode], { type: "text/plain" });
      await guardarBlobComoArchivo(blob, nombreArchivo);
    } catch {
      setError(true);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={descargar}
        disabled={descargando}
      >
        <DownloadAnimado className="size-4" strokeWidth={1.75} />
        {descargando ? "Descargando…" : "Descargar G-code"}
      </Button>
      {error ? (
        <p role="alert" className="text-danger text-xs">
          No se pudo descargar.
        </p>
      ) : null}
    </div>
  );
}
