import { useMemo } from "react";
import { parsearGcodeASegmentos } from "@/lib/gcode-preview";

interface ToolpathPreviewProps {
  gcode: string;
  anchoMm: number;
  altoMm: number;
}

const MARGEN_MM = 2;

/**
 * El toolpath real que va a grabar la máquina, no un boceto: son las
 * coordenadas del G-code que el propio CLI generó. Trazo sólido = láser
 * activo (corte o relleno); punteado gris = desplazamiento en vacío.
 * El G-code mide Y desde abajo (convención CNC); el viewBox de SVG mide
 * desde arriba, así que se invierte al dibujar.
 */
export function ToolpathPreview({
  gcode,
  anchoMm,
  altoMm,
}: ToolpathPreviewProps) {
  const segmentos = useMemo(() => parsearGcodeASegmentos(gcode), [gcode]);
  const anchoTotal = anchoMm + MARGEN_MM * 2;
  const altoTotal = altoMm + MARGEN_MM * 2;

  return (
    <div className="bg-surface border-border flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-md)] border p-4">
      <svg
        viewBox={`${-MARGEN_MM} ${-MARGEN_MM} ${anchoTotal} ${altoTotal}`}
        className="h-full w-full"
        role="img"
        aria-label={`Toolpath resultante: ${segmentos.length} movimientos sobre ${anchoMm} por ${altoMm} milímetros`}
      >
        <rect
          x={0}
          y={0}
          width={anchoMm}
          height={altoMm}
          className="stroke-border fill-none"
          strokeWidth={anchoMm / 300}
        />
        {segmentos.map((segmento, indice) => (
          <line
            key={indice}
            x1={segmento.x1}
            y1={altoMm - segmento.y1}
            x2={segmento.x2}
            y2={altoMm - segmento.y2}
            className={
              segmento.tipo === "activo" ? "stroke-blue" : "stroke-border"
            }
            strokeWidth={
              segmento.tipo === "activo" ? anchoMm / 200 : anchoMm / 400
            }
            strokeDasharray={
              segmento.tipo === "desplazamiento"
                ? `${anchoMm / 100} ${anchoMm / 100}`
                : undefined
            }
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}
