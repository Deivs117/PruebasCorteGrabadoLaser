"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  /** Lado donde aparece respecto del trigger — el sidebar colapsado (#114)
   * es el único uso hoy, siempre a la derecha. */
  lado?: "derecha";
}

const MARGEN_PX = 8;

/**
 * Tooltip liviano sin librería (sin Radix/floating-ui, mismo criterio que
 * el resto del design system: `MaterialDrawer` usa `<dialog>` nativo en vez
 * de una librería de modales). Portal a `document.body` en vez de un
 * `position: absolute` dentro del propio contenedor: el sidebar colapsado
 * (#114) tiene `overflow-y-auto`, y por la mecánica de `overflow` en CSS
 * eso fuerza `overflow-x` a comportarse como `auto` también -- un tooltip
 * posicionado adentro se recortaría contra el ancho angosto del riel de
 * íconos en vez de sobresalir hacia el contenido.
 */
export function Tooltip({ label, children, lado = "derecha" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const referenciaRef = useRef<HTMLSpanElement>(null);

  function mostrar() {
    const rect = referenciaRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosicion({
      top: rect.top + rect.height / 2,
      left: lado === "derecha" ? rect.right + MARGEN_PX : rect.left - MARGEN_PX,
    });
    setVisible(true);
  }

  return (
    // El <span> solo relaya hover/focus del hijo interactivo real (el
    // `<Link>` que envuelve) -- no es él mismo un control, así que no le
    // hace falta un role ni soporte de teclado propio.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      ref={referenciaRef}
      onMouseEnter={mostrar}
      onMouseLeave={() => setVisible(false)}
      onFocus={mostrar}
      onBlur={() => setVisible(false)}
      className="contents"
    >
      {children}
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: posicion.top, left: posicion.left }}
            className={clsx(
              "bg-navy pointer-events-none fixed z-50 -translate-y-1/2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg",
              "transition-opacity duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
            )}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
