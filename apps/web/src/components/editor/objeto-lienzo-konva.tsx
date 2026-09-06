"use client";

import { useMemo } from "react";
import { Group, Image as KonvaImage, Line, Rect } from "react-konva";
import { svgADataUri } from "@/lib/svg-data-uri";
import { parsearGcodeASegmentos } from "@/lib/gcode-preview";
import type { EstadoToolpath, ObjetoLienzo } from "@/lib/editor-tipos";
import { useImagenCargada } from "@/components/editor/usar-imagen-cargada";

interface ObjetoLienzoKonvaProps {
  objeto: ObjetoLienzo;
  pxPorMm: number;
  areaTrabajoAltoMm: number;
  seleccionado: boolean;
  excedeArea: boolean;
  vistaToolpath: boolean;
  onSeleccionar: () => void;
  onMover: (xMm: number, yMm: number) => void;
}

/** mm → px del lienzo. Y se invierte porque el toolkit mide desde abajo
 * (como GRBL) y Konva/canvas miden desde arriba, igual que en
 * `ToolpathPreview`. */
function aPx(xMm: number, yMm: number, pxPorMm: number, areaAltoMm: number) {
  return { x: xMm * pxPorMm, y: (areaAltoMm - yMm) * pxPorMm };
}

/**
 * Un objeto posicionable del lienzo (#16): imagen/SVG de fondo +, si se
 * pidió, el toolpath ya generado encima. La posición y rotación son
 * transformaciones del propio `Group` de Konva — el contenido interno
 * siempre se dibuja en su espacio local sin rotar, igual que va a hacer
 * `laser_toolkit` cuando genere el G-code real (rotar coordenadas ya
 * generadas, no el algoritmo de barrido en sí, ver nota técnica en #15/#16).
 */
export function ObjetoLienzoKonva({
  objeto,
  pxPorMm,
  areaTrabajoAltoMm,
  seleccionado,
  excedeArea,
  vistaToolpath,
  onSeleccionar,
  onMover,
}: ObjetoLienzoKonvaProps) {
  const src =
    objeto.tipo === "svg" ? svgADataUri(objeto.contenidoSvg) : objeto.dataUri;
  const imagen = useImagenCargada(src);
  const anchoPx = objeto.anchoMm * pxPorMm;
  const altoPx = objeto.altoMm * pxPorMm;
  const centro = aPx(objeto.xMm, objeto.yMm, pxPorMm, areaTrabajoAltoMm);

  const segmentosPorOperacion = useMemo(() => {
    if (objeto.tipo !== "svg") return [];
    const resultados = Object.values(objeto.toolpath) as (
      EstadoToolpath | undefined
    )[];
    return resultados
      .filter(
        (t): t is Extract<EstadoToolpath, { estado: "ok" }> =>
          t?.estado === "ok",
      )
      .flatMap((t) => parsearGcodeASegmentos(t.gcode));
  }, [objeto]);

  return (
    <Group
      x={centro.x}
      y={centro.y}
      rotation={objeto.rotacionDeg}
      draggable
      onClick={onSeleccionar}
      onTap={onSeleccionar}
      onDragMove={(e) => {
        const { x, y } = e.target.position();
        onMover(x / pxPorMm, areaTrabajoAltoMm - y / pxPorMm);
      }}
    >
      {imagen ? (
        <KonvaImage
          image={imagen}
          x={-anchoPx / 2}
          y={-altoPx / 2}
          width={anchoPx}
          height={altoPx}
          opacity={vistaToolpath ? 0.25 : 1}
        />
      ) : (
        <Rect
          x={-anchoPx / 2}
          y={-altoPx / 2}
          width={anchoPx}
          height={altoPx}
          fill="#e2e8f0"
        />
      )}

      {vistaToolpath &&
        segmentosPorOperacion.map((segmento, indice) => (
          <Line
            key={indice}
            points={[
              -anchoPx / 2 + segmento.x1 * pxPorMm,
              altoPx / 2 - segmento.y1 * pxPorMm,
              -anchoPx / 2 + segmento.x2 * pxPorMm,
              altoPx / 2 - segmento.y2 * pxPorMm,
            ]}
            stroke={segmento.tipo === "activo" ? "#246bce" : "#e2e8f0"}
            strokeWidth={segmento.tipo === "activo" ? 1 : 0.5}
            dash={segmento.tipo === "desplazamiento" ? [3, 3] : undefined}
          />
        ))}

      <Rect
        x={-anchoPx / 2}
        y={-altoPx / 2}
        width={anchoPx}
        height={altoPx}
        stroke={excedeArea ? "#dc2626" : seleccionado ? "#246bce" : undefined}
        strokeWidth={excedeArea || seleccionado ? 2 : 0}
        dash={seleccionado && !excedeArea ? [4, 4] : undefined}
      />
    </Group>
  );
}
