"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

interface RevealProps {
  children: React.ReactNode;
  /** Retraso en ms para escalonar varios Reveal en secuencia (ej. tarjetas de un grid). */
  delayMs?: number;
  className?: string;
}

/**
 * Transición de entrada para contenido que aparece después de la carga
 * inicial (datos leídos del sistema de archivos, resultado de una acción).
 * Nunca "aparece de la nada": entra con una traducción y fundido cortos.
 * Con `prefers-reduced-motion: reduce` el CSS global anula la duración,
 * así que el contenido sigue apareciendo, solo que sin animación.
 */
export function Reveal({ children, delayMs = 0, className }: RevealProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  return (
    <div
      className={clsx(
        "transition-all duration-[var(--duration-slow)] ease-[var(--ease-motion)]",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
