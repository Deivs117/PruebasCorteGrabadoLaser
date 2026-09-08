"use client";

import { CopyAnimado } from "@/components/ui/icons/copy-animado";
import { FlipHorizontalAnimado } from "@/components/ui/icons/flip-horizontal-animado";
import { FlipVerticalAnimado } from "@/components/ui/icons/flip-vertical-animado";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { iconButtonClasses } from "@/lib/button-styles";

interface BarraAccionesObjetoProps {
  /** Posición en px de pantalla (relativa al contenedor del lienzo), ya
   * centrada horizontalmente y apoyada sobre el borde superior del
   * bounding box del objeto -- ver `editor-vista.ts` para el cálculo. */
  xPx: number;
  yPx: number;
  onEspejarHorizontal: () => void;
  onEspejarVertical: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
}

/**
 * Barra de acciones rápidas flotante sobre el objeto seleccionado (#107):
 * espejar horizontal/vertical, duplicar y eliminar -- eliminar ya existía
 * en el panel numérico, duplicar/espejar son nuevos acá. Overlay HTML
 * posicionado a mano encima del `Stage` de Konva (más simple que dibujar
 * botones interactivos dentro del propio canvas, mismo resultado visual).
 */
export function BarraAccionesObjeto({
  xPx,
  yPx,
  onEspejarHorizontal,
  onEspejarVertical,
  onDuplicar,
  onEliminar,
}: BarraAccionesObjetoProps) {
  return (
    <div
      className="border-border bg-surface absolute z-10 flex -translate-x-1/2 -translate-y-full gap-0.5 rounded-[var(--radius-sm)] border p-1 shadow-md"
      style={{ left: xPx, top: yPx }}
    >
      <button
        type="button"
        onClick={onEspejarHorizontal}
        aria-label="Espejar horizontalmente"
        className={iconButtonClasses()}
      >
        <FlipHorizontalAnimado className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={onEspejarVertical}
        aria-label="Espejar verticalmente"
        className={iconButtonClasses()}
      >
        <FlipVerticalAnimado className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={onDuplicar}
        aria-label="Duplicar objeto"
        className={iconButtonClasses()}
      >
        <CopyAnimado className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={onEliminar}
        aria-label="Eliminar objeto"
        className={iconButtonClasses("danger")}
      >
        <TrashCanAnimado className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
