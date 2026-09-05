"use client";

import { useRef, useState } from "react";

interface Tick {
  id: number;
  texto: string;
}

/**
 * Feedback "+1"/"-1" flotante para contadores (ver NumberStepper): cada
 * click agrega un tick que sube y se desvanece (@keyframes counter-flota)
 * y se saca solo del DOM al terminar, vía onAnimationEnd -- no hay timers
 * que puedan desincronizarse con la duración real de la animación.
 */
export function useContadorFeedback() {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const siguienteId = useRef(0);

  function disparar(texto: string) {
    const id = siguienteId.current++;
    setTicks((actual) => [...actual, { id, texto }]);
  }

  function quitar(id: number) {
    setTicks((actual) => actual.filter((t) => t.id !== id));
  }

  const capa = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-1 flex justify-center"
    >
      {ticks.map((tick) => (
        <span
          key={tick.id}
          onAnimationEnd={() => quitar(tick.id)}
          className="text-navy absolute animate-[counter-flota_600ms_ease-out_forwards] font-mono text-xs font-semibold"
        >
          {tick.texto}
        </span>
      ))}
    </div>
  );

  return { disparar, capa };
}
