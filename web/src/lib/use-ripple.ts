"use client";

import { useCallback, useState, type PointerEvent } from "react";

export interface Ripple {
  id: number;
  x: number;
  y: number;
  diametro: number;
}

let contador = 0;

/**
 * Onda expansiva desde el punto de click — feedback físico de "esto
 * registró tu click", sin depender de ninguna librería de animación (el
 * resto del CSS de movimiento de la app tampoco usa una). El elemento que
 * lo use necesita `position: relative` y `overflow: hidden`.
 */
export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const iniciar = useCallback((evento: PointerEvent<HTMLElement>) => {
    if (evento.button !== 0) return; // solo click principal, no click derecho
    const elemento = evento.currentTarget;
    const rect = elemento.getBoundingClientRect();
    // Diámetro generoso (la diagonal completa x2): alcanza la esquina más
    // lejana del elemento sin importar dónde caiga el click.
    const diametro = Math.hypot(rect.width, rect.height) * 2;
    const id = ++contador;
    setRipples((anteriores) => [
      ...anteriores,
      {
        id,
        x: evento.clientX - rect.left,
        y: evento.clientY - rect.top,
        diametro,
      },
    ]);
  }, []);

  const quitar = useCallback((id: number) => {
    setRipples((anteriores) => anteriores.filter((r) => r.id !== id));
  }, []);

  return { ripples, iniciar, quitar };
}
