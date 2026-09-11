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
  /** Issue #179: mecanismo general de agrupación (no solo para la máscara
   * de corte automática, ver `generarContornoCorte`) -- a lo sumo uno de
   * los dos aparece: "Agrupar" con 2+ seleccionados que no forman ya un
   * mismo grupo, "Desagrupar" cuando la selección ES un grupo existente.
   * `undefined` = esa acción no aplica a la selección actual, no se
   * renderiza el botón. */
  onAgrupar?: () => void;
  onDesagrupar?: () => void;
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
  onAgrupar,
  onDesagrupar,
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
      {onAgrupar ? (
        <button
          type="button"
          onClick={onAgrupar}
          aria-label="Agrupar selección"
          title="Agrupar -- se mueven/rotan/escalan siempre juntos"
          className={iconButtonClasses()}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="12" height="12" rx="1" />
            <rect x="9" y="9" width="12" height="12" rx="1" />
          </svg>
        </button>
      ) : null}
      {onDesagrupar ? (
        <button
          type="button"
          onClick={onDesagrupar}
          aria-label="Desagrupar selección"
          title="Desagrupar -- vuelven a moverse/rotarse/escalarse por separado"
          className={iconButtonClasses()}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="9" height="9" rx="1" />
            <rect x="13" y="13" width="9" height="9" rx="1" />
          </svg>
        </button>
      ) : null}
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
