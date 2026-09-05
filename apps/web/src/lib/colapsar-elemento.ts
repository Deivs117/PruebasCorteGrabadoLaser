"use client";

// Debe coincidir con --duration-standard en globals.css: no hay forma barata
// de leer un custom property desde JS sin un getComputedStyle extra, y este
// valor no cambia salvo que alguien retoque el sistema de diseño a mano.
const DURACION_MS = 250;

/**
 * Anima el colapso de un elemento (fundido + achicado a 0 alto) antes de
 * que React lo saque del árbol -- para que borrar algo de una lista no
 * desaparezca de golpe. Se resuelve la promesa cuando termina, recién ahí
 * quien llama debe quitar el dato real (ej. `router.refresh()`).
 *
 * Si el usuario prefiere movimiento reducido, se resuelve al toque: la
 * regla global en globals.css ya deja las transiciones en ~0ms, pero acá
 * evitamos además el salto de layout que dejaría max-height a mitad de camino.
 */
export async function colapsarYEsperar(
  elemento: HTMLElement | null,
): Promise<void> {
  if (!elemento) return;

  const prefiereMovimientoReducido = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefiereMovimientoReducido) return;

  const alturaActual = elemento.getBoundingClientRect().height;
  elemento.style.overflow = "hidden";
  elemento.style.maxHeight = `${alturaActual}px`;
  elemento.style.transition =
    `max-height var(--duration-standard) var(--ease-motion), ` +
    `opacity var(--duration-standard) var(--ease-motion), ` +
    `margin var(--duration-standard) var(--ease-motion)`;
  // Fuerza al navegador a pintar el max-height inicial antes de animar a 0
  // -- si no, ambos cambios de estilo se aplican en el mismo frame y no hay
  // nada que transicionar.
  elemento.getBoundingClientRect();

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      elemento.style.maxHeight = "0px";
      elemento.style.opacity = "0";
      elemento.style.marginTop = "0px";
      elemento.style.marginBottom = "0px";
      window.setTimeout(resolve, DURACION_MS);
    });
  });
}
