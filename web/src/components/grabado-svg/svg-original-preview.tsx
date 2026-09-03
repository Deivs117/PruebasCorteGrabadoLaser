"use client";

import { useMemo } from "react";

interface SvgOriginalPreviewProps {
  contenido: string;
}

/**
 * Muestra el SVG tal cual lo subió el técnico. Se renderiza como imagen
 * (data URI), no inyectado en el DOM: un SVG puede traer <script> o
 * atributos de evento, y como imagen el navegador nunca los ejecuta.
 */
export function SvgOriginalPreview({ contenido }: SvgOriginalPreviewProps) {
  const dataUri = useMemo(() => {
    const codificado = encodeURIComponent(contenido)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");
    return `data:image/svg+xml,${codificado}`;
  }, [contenido]);

  return (
    <div className="bg-surface border-border flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-md)] border p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG arbitrario del técnico, servido como data URI, no un asset del sitio */}
      <img
        src={dataUri}
        alt="SVG original subido"
        className="max-h-full max-w-full"
      />
    </div>
  );
}
