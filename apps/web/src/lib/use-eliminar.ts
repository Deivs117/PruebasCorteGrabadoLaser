"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { colapsarYEsperar } from "@/lib/colapsar-elemento";

interface OpcionesEliminar {
  /** Endpoint DELETE a llamar. */
  url: string;
  /** Qué hacer con el router una vez borrado y animada la salida. Por
   * defecto refresca la lista actual (`router.refresh()`); algunas
   * pantallas necesitan navegar a otro lado (ej. borrar el SVG que se
   * estaba viendo). */
  alTerminar?: (router: ReturnType<typeof useRouter>) => void;
}

/**
 * Toda la lógica repetida entre los botones "Eliminar" de Suites, SVGs,
 * corridas y grupos de Final Run: confirmar, borrar en el servidor, animar
 * la salida del elemento (`data-eliminable` en el ancestro más cercano,
 * normalmente un <Card>) y recién ahí refrescar/navegar.
 */
export function useEliminar({ url, alTerminar }: OpcionesEliminar) {
  const router = useRouter();
  const botonRef = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    setEliminando(true);
    await fetch(url, { method: "DELETE" });
    setAbierto(false);
    const contenedor =
      botonRef.current?.closest<HTMLElement>("[data-eliminable]") ?? null;
    await colapsarYEsperar(contenedor);
    setEliminando(false);
    if (alTerminar) {
      alTerminar(router);
    } else {
      router.refresh();
    }
  }

  return { botonRef, abierto, setAbierto, eliminando, eliminar };
}
