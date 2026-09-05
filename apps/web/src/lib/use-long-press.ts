"use client";

import { useCallback, useRef, useState } from "react";

interface UseLongPressOptions {
  duracionMs?: number;
  onLongPress: () => void;
}

/**
 * Mantener presionado (mouse o touch) durante `duracionMs` antes de disparar
 * `onLongPress` — a propósito más difícil de gatillar sin querer que un
 * click, para una acción que vale la pena confirmar con gesto en vez de con
 * otro formulario. Soltar antes de tiempo cancela sin efecto.
 */
export function useLongPress({
  duracionMs = 650,
  onLongPress,
}: UseLongPressOptions) {
  const [presionando, setPresionando] = useState(false);
  const timerRef = useRef<number | null>(null);

  const iniciar = useCallback(() => {
    setPresionando(true);
    timerRef.current = window.setTimeout(() => {
      setPresionando(false);
      timerRef.current = null;
      onLongPress();
    }, duracionMs);
  }, [duracionMs, onLongPress]);

  const cancelar = useCallback(() => {
    setPresionando(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    presionando,
    duracionMs,
    handlers: {
      onMouseDown: iniciar,
      onMouseUp: cancelar,
      onMouseLeave: cancelar,
      onTouchStart: iniciar,
      onTouchEnd: cancelar,
      onTouchCancel: cancelar,
    },
  };
}
