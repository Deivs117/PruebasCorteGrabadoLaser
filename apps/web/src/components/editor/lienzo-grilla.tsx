"use client";

import { Fragment, useMemo } from "react";
import { Line } from "react-konva";
import { pasoGrillaMm } from "@/lib/editor-vista";

interface LienzoGrillaProps {
  areaTrabajoAnchoMm: number;
  areaTrabajoAltoMm: number;
  pxPorMm: number;
  zoom: number;
}

/**
 * Grilla de fondo del área de trabajo (#107): se dibuja en el mismo espacio
 * "de contenido" que los objetos (mm * `pxPorMm`, sin aplicar el zoom acá)
 * -- el `Stage` que la contiene ya escala y desplaza todo su contenido
 * junto (zoom/pan), así que este componente no necesita saber nada de eso,
 * solo recalcular el paso cuando cambia la escala efectiva.
 *
 * Cubre nada más el área de trabajo real (acotada, no un plano infinito),
 * así que dibujar todas las líneas de una sola vez sale barato incluso al
 * paso más fino (1mm).
 */
export function LienzoGrilla({
  areaTrabajoAnchoMm,
  areaTrabajoAltoMm,
  pxPorMm,
  zoom,
}: LienzoGrillaProps) {
  const pasoMm = pasoGrillaMm(pxPorMm * zoom);
  const anchoPx = areaTrabajoAnchoMm * pxPorMm;
  const altoPx = areaTrabajoAltoMm * pxPorMm;

  const { verticalesMm, horizontalesMm } = useMemo(() => {
    const nX = Math.floor(areaTrabajoAnchoMm / pasoMm);
    const nY = Math.floor(areaTrabajoAltoMm / pasoMm);
    return {
      verticalesMm: Array.from({ length: nX + 1 }, (_, i) => i * pasoMm),
      horizontalesMm: Array.from({ length: nY + 1 }, (_, i) => i * pasoMm),
    };
  }, [areaTrabajoAnchoMm, areaTrabajoAltoMm, pasoMm]);

  // Cada 5° paso se marca más oscuro (ej. cada 5mm cuando el paso es 1mm) --
  // referencia visual de "medio centímetro"/"medio paso" sin recargar el
  // resto de la grilla.
  function esLineaMayor(indice: number) {
    return indice % 5 === 0;
  }

  return (
    <Fragment>
      {verticalesMm.map((xMm, i) => (
        <Line
          key={`v-${xMm}`}
          points={[xMm * pxPorMm, 0, xMm * pxPorMm, altoPx]}
          stroke={esLineaMayor(i) ? "#cbd5e1" : "#eef2f6"}
          strokeWidth={1 / zoom}
          listening={false}
        />
      ))}
      {horizontalesMm.map((yMm, i) => (
        <Line
          key={`h-${yMm}`}
          points={[0, yMm * pxPorMm, anchoPx, yMm * pxPorMm]}
          stroke={esLineaMayor(i) ? "#cbd5e1" : "#eef2f6"}
          strokeWidth={1 / zoom}
          listening={false}
        />
      ))}
    </Fragment>
  );
}
