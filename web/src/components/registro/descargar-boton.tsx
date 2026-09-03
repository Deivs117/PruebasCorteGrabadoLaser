"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonVariant } from "@/lib/button-styles";
import { descargarArchivo } from "@/lib/descargar-archivo";

interface DescargarBotonProps {
  archivo: string;
  etiqueta: string;
  variant?: ButtonVariant;
}

export function DescargarBoton({
  archivo,
  etiqueta,
  variant = "outline",
}: DescargarBotonProps) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(false);

  async function descargar() {
    setDescargando(true);
    setError(false);
    try {
      await descargarArchivo(archivo);
    } catch {
      setError(true);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size="sm"
        onClick={descargar}
        disabled={descargando}
      >
        <Download className="size-4" strokeWidth={1.75} />
        {descargando ? "Descargando…" : etiqueta}
      </Button>
      {error ? (
        <p role="alert" className="text-danger text-xs">
          No se pudo descargar.
        </p>
      ) : null}
    </div>
  );
}
