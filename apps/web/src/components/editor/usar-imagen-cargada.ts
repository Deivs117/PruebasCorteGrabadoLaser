"use client";

import { useEffect, useState } from "react";

/**
 * Carga un `HTMLImageElement` desde un `src` (data URI o URL) para pasarlo a
 * un `<Konva.Image>` — Konva dibuja sobre un `<canvas>` real, no puede usar
 * `<img>`/`background-image` directo, necesita el elemento ya decodificado.
 * Devuelve `undefined` mientras carga o si `src` no está — quien llama
 * decide qué mostrar de placeholder mientras tanto.
 */
export function useImagenCargada(
  src: string | undefined,
): HTMLImageElement | undefined {
  const [imagen, setImagen] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!src) {
      // Limpia la imagen anterior cuando `src` desaparece (objeto sin
      // imagen todavía) -- no hay forma de derivar esto durante el render,
      // el elemento vive fuera de React (un HTMLImageElement real).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImagen(undefined);
      return;
    }
    const elemento = new window.Image();
    elemento.onload = () => setImagen(elemento);
    elemento.src = src;
    return () => {
      elemento.onload = null;
    };
  }, [src]);

  return imagen;
}

/** Dimensiones naturales de una imagen (SVG o raster) ya cargada como data
 * URI — se usa una sola vez al subir un objeto nuevo, para calcular su
 * ancho/alto inicial en mm preservando la proporción real del archivo. */
export function medirImagen(
  src: string,
): Promise<{ anchoPx: number; altoPx: number }> {
  return new Promise((resolve, reject) => {
    const elemento = new window.Image();
    elemento.onload = () =>
      resolve({
        anchoPx: elemento.naturalWidth,
        altoPx: elemento.naturalHeight,
      });
    elemento.onerror = () => reject(new Error("No se pudo leer la imagen."));
    elemento.src = src;
  });
}
