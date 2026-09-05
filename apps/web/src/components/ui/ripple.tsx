"use client";

import type { Ripple } from "@/lib/use-ripple";

/** Las ondas en sí — usar junto a `useRipple()`, dentro de un contenedor
 * `relative overflow-hidden`. Separado del hook para no repetir el JSX en
 * cada botón que lo use (Button, chips de filtro, etc.). */
export function RippleCapa({
  ripples,
  quitar,
}: {
  ripples: Ripple[];
  quitar: (id: number) => void;
}) {
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="boton-ripple"
          style={{
            left: r.x - r.diametro / 2,
            top: r.y - r.diametro / 2,
            width: r.diametro,
            height: r.diametro,
          }}
          onAnimationEnd={() => quitar(r.id)}
        />
      ))}
    </>
  );
}
