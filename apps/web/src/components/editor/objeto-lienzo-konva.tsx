"use client";

import { useMemo, useRef } from "react";
import type Konva from "konva";
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
  /** Color del borde de selección -- por tipo de operación (#107), ver
   * `editor-colores.ts`. Solo se usa cuando `seleccionado` es true. */
  color: string;
  /** #149 -- `aditivo` es `true` cuando el click vino con Shift: el lienzo
   * lo suma/saca de la selección múltiple en vez de reemplazarla. */
  onSeleccionar: (aditivo: boolean) => void;
  onMover: (xMm: number, yMm: number) => void;
  /** Se llama al soltar un handle de resize/rotación del `Transformer` del
   * lienzo (#107) -- separado de `onMover` porque acá cambian también
   * ancho/alto/rotación, no solo la posición. */
  onTransformar: (cambios: {
    xMm: number;
    yMm: number;
    anchoMm: number;
    altoMm: number;
    rotacionDeg: number;
  }) => void;
  /** Registra (o desregistra, con `null`) el nodo real de Konva de este
   * objeto -- el `Transformer` del lienzo lo necesita para poder engancharle
   * los handles al que esté seleccionado. */
  registrarNodo: (nodo: Konva.Group | null) => void;
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
 *
 * El espejado (#107) es una transformación aparte, aplicada a un `Group`
 * interno que envuelve solo el contenido visual (imagen + toolpath) -- el
 * `Group` externo (posición/rotación/drag/handles del `Transformer`) queda
 * sin tocar, porque escalar en -1 el mismo nodo que maneja el drag
 * confundiría la lectura de ancho/alto real durante un resize.
 */
export function ObjetoLienzoKonva({
  objeto,
  pxPorMm,
  areaTrabajoAltoMm,
  seleccionado,
  excedeArea,
  vistaToolpath,
  color,
  onSeleccionar,
  onMover,
  onTransformar,
  registrarNodo,
}: ObjetoLienzoKonvaProps) {
  const grupoRef = useRef<Konva.Group | null>(null);
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

  function alTerminarTransformar() {
    const nodo = grupoRef.current;
    if (!nodo) return;
    const escalaX = nodo.scaleX();
    const escalaY = nodo.scaleY();
    // El Transformer escala el nodo (`scaleX`/`scaleY`); una vez leído ese
    // factor lo volcamos a ancho/alto en mm y reseteamos la escala del nodo
    // a 1 -- si no, el próximo resize compondría sobre una escala ya
    // aplicada y las mm dejarían de corresponder al tamaño visual real.
    nodo.scaleX(1);
    nodo.scaleY(1);
    onTransformar({
      xMm: nodo.x() / pxPorMm,
      yMm: areaTrabajoAltoMm - nodo.y() / pxPorMm,
      anchoMm: Math.max(objeto.anchoMm * escalaX, 1),
      altoMm: Math.max(objeto.altoMm * escalaY, 1),
      rotacionDeg: ((Math.round(nodo.rotation()) % 360) + 360) % 360,
    });
  }

  return (
    <Group
      ref={(nodo) => {
        grupoRef.current = nodo;
        registrarNodo(nodo);
      }}
      x={centro.x}
      y={centro.y}
      rotation={objeto.rotacionDeg}
      draggable
      onClick={(e) => onSeleccionar(e.evt.shiftKey)}
      // El toque en pantallas táctiles no tiene Shift -- nunca es aditivo.
      onTap={() => onSeleccionar(false)}
      onDragMove={(e) => {
        const { x, y } = e.target.position();
        onMover(x / pxPorMm, areaTrabajoAltoMm - y / pxPorMm);
      }}
      onTransformEnd={alTerminarTransformar}
    >
      <Group
        scaleX={objeto.espejadoH ? -1 : 1}
        scaleY={objeto.espejadoV ? -1 : 1}
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
      </Group>

      <Rect
        x={-anchoPx / 2}
        y={-altoPx / 2}
        width={anchoPx}
        height={altoPx}
        stroke={excedeArea ? "#dc2626" : seleccionado ? color : undefined}
        strokeWidth={excedeArea || seleccionado ? 2 : 0}
        dash={seleccionado && !excedeArea ? [4, 4] : undefined}
      />
    </Group>
  );
}
