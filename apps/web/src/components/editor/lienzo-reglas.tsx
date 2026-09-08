"use client";

import { Fragment, useMemo } from "react";
import { Layer, Line, Rect, Text } from "react-konva";
import { pasoGrillaMm, type VistaLienzo } from "@/lib/editor-vista";

interface LienzoReglasProps {
  vista: VistaLienzo;
  anchoStagePx: number;
  altoStagePx: number;
  margenPx: number;
}

/**
 * Reglas de medición en los bordes superior e izquierdo (#107), actualizadas
 * en vivo con el zoom/pan. Viven en su propia `Layer` con una transformación
 * que deshace exactamente la del `Stage` (zoom/pan) -- el contenido real
 * (grilla + objetos) sí se mueve/escala con el `Stage`, pero un número como
 * "35" tiene que seguir siendo legible sin importar cuánto zoom haya, así
 * que esta capa cancela esa transformación antes de dibujar y calcula las
 * marcas a mano a partir de `vista`.
 */
export function LienzoReglas({
  vista,
  anchoStagePx,
  altoStagePx,
  margenPx,
}: LienzoReglasProps) {
  const { pxPorMm, zoom, panX, panY, areaTrabajoAltoMm } = vista;
  const escala = pxPorMm * zoom;
  const pasoMm = pasoGrillaMm(escala);

  const marcasX = useMemo(() => {
    const minMm = (margenPx - panX) / escala;
    const maxMm = (anchoStagePx - panX) / escala;
    const desde = Math.floor(minMm / pasoMm) * pasoMm;
    const marcas: number[] = [];
    for (let mm = desde; mm <= maxMm; mm += pasoMm) marcas.push(mm);
    return marcas;
  }, [margenPx, panX, escala, anchoStagePx, pasoMm]);

  const marcasY = useMemo(() => {
    const minMm = areaTrabajoAltoMm - (altoStagePx - panY) / escala;
    const maxMm = areaTrabajoAltoMm - (margenPx - panY) / escala;
    const desde = Math.floor(minMm / pasoMm) * pasoMm;
    const marcas: number[] = [];
    for (let mm = desde; mm <= maxMm; mm += pasoMm) marcas.push(mm);
    return marcas;
  }, [areaTrabajoAltoMm, altoStagePx, panY, escala, margenPx, pasoMm]);

  return (
    <Layer
      x={-panX / zoom}
      y={-panY / zoom}
      scaleX={1 / zoom}
      scaleY={1 / zoom}
      listening={false}
    >
      {/* Fondo de ambas bandas, para que la grilla no se vea "a través". */}
      <Rect x={0} y={0} width={anchoStagePx} height={margenPx} fill="#f8fafc" />
      <Rect x={0} y={0} width={margenPx} height={altoStagePx} fill="#f8fafc" />

      {marcasX.map((mm) => {
        const x = panX + mm * escala;
        return (
          <Fragment key={`x-${mm}`}>
            <Line
              points={[x, margenPx - 6, x, margenPx]}
              stroke="#94a3b8"
              strokeWidth={1}
            />
            <Text
              x={x + 2}
              y={2}
              text={String(Math.round(mm))}
              fontSize={9}
              fill="#5a7184"
            />
          </Fragment>
        );
      })}

      {marcasY.map((mm) => {
        const y = panY + (areaTrabajoAltoMm - mm) * escala;
        return (
          <Fragment key={`y-${mm}`}>
            <Line
              points={[margenPx - 6, y, margenPx, y]}
              stroke="#94a3b8"
              strokeWidth={1}
            />
            <Text
              x={2}
              y={y + 2}
              text={String(Math.round(mm))}
              fontSize={9}
              fill="#5a7184"
              rotation={0}
            />
          </Fragment>
        );
      })}

      <Rect
        x={0}
        y={0}
        width={anchoStagePx}
        height={margenPx}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <Rect
        x={0}
        y={0}
        width={margenPx}
        height={altoStagePx}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
    </Layer>
  );
}
