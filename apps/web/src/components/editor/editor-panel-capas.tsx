"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { iconButtonClasses } from "@/lib/button-styles";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { svgADataUri } from "@/lib/svg-data-uri";
import type { ObjetoLienzo } from "@/lib/editor-tipos";

interface EditorPanelCapasProps {
  objetos: ObjetoLienzo[];
  seleccionadosIds: string[];
  areaTrabajoAnchoMm: number;
  areaTrabajoAltoMm: number;
  excedeArea: (objeto: ObjetoLienzo) => boolean;
  onSeleccionar: (id: string, aditivo: boolean) => void;
  onEliminar: (ids: string[]) => void;
  onCambiarVisibilidad: (ids: string[], visible: boolean) => void;
  /** El nuevo `objetos[]` completo, ya en el orden elegido -- issue #179:
   * el orden de la lista ES el orden real de exportación, no hay un estado
   * de "orden visual" aparte que sincronizar. */
  onReordenar: (nuevosObjetos: ObjetoLienzo[]) => void;
}

function fuenteDe(objeto: ObjetoLienzo): string {
  return objeto.tipo === "svg"
    ? svgADataUri(objeto.contenidoSvg)
    : objeto.dataUri;
}

interface UnidadCapa {
  /** `grupoId` para un grupo, `id` del objeto para uno suelto -- key de
   * React y de drag&drop. */
  id: string;
  objetos: ObjetoLienzo[];
}

/** Agrupa `objetos[]` (orden real del lienzo) en "unidades" de lista --
 * cada grupo (issue #179) se muestra como UNA fila, no una por miembro, y
 * arrastra como unidad. Preserva el primer orden de aparición. */
function agruparEnUnidades(objetos: ObjetoLienzo[]): UnidadCapa[] {
  const unidades: UnidadCapa[] = [];
  const vistos = new Set<string>();
  for (const objeto of objetos) {
    if (vistos.has(objeto.id)) continue;
    if (objeto.grupoId) {
      const miembros = objetos.filter((o) => o.grupoId === objeto.grupoId);
      for (const miembro of miembros) vistos.add(miembro.id);
      unidades.push({ id: objeto.grupoId, objetos: miembros });
    } else {
      vistos.add(objeto.id);
      unidades.push({ id: objeto.id, objetos: [objeto] });
    }
  }
  return unidades;
}

/**
 * Panel de capas real del Editor de Diseño (issue #179): miniatura,
 * reordenar (drag&drop nativo, sin librería nueva -- mismo criterio que
 * `SubirObjetoDropzone`), mostrar/ocultar. La lista se muestra de arriba
 * (lo último agregado/lo que se ve más "al frente" en el lienzo) hacia
 * abajo -- Konva dibuja `objetos[]` en orden, así que el ÚLTIMO del array
 * es el que se ve encima; mostrarlo primero en la lista es el mismo
 * criterio que Photoshop/Figma ("la capa de arriba de la lista es la que
 * está al frente").
 */
export function EditorPanelCapas({
  objetos,
  seleccionadosIds,
  excedeArea,
  onSeleccionar,
  onEliminar,
  onCambiarVisibilidad,
  onReordenar,
}: EditorPanelCapasProps) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);

  if (objetos.length === 0) {
    return (
      <p className="text-text-muted text-sm">
        Todavía no hay ningún objeto en el lienzo.
      </p>
    );
  }

  // De arriba (al frente) hacia abajo (al fondo) para mostrar -- inverso al
  // orden real de `objetos[]` (Konva dibuja en orden, el último queda
  // encima).
  const unidades = [...agruparEnUnidades(objetos)].reverse();

  function moverUnidad(idArrastrada: string, idDestino: string) {
    if (idArrastrada === idDestino) return;
    const indiceOrigen = unidades.findIndex((u) => u.id === idArrastrada);
    const indiceDestino = unidades.findIndex((u) => u.id === idDestino);
    if (indiceOrigen === -1 || indiceDestino === -1) return;
    const reordenadas = [...unidades];
    const [movida] = reordenadas.splice(indiceOrigen, 1);
    if (!movida) return;
    reordenadas.splice(indiceDestino, 0, movida);
    // Se vuelve a invertir (la lista se mostraba al revés del array real)
    // y se aplana -- los miembros de cada grupo viajan juntos y contiguos.
    onReordenar(reordenadas.toReversed().flatMap((u) => u.objetos));
  }

  return (
    <ul className="flex flex-col gap-1.5" aria-label="Capas del lienzo">
      {unidades.map((unidad) => {
        const esGrupo = unidad.objetos.length > 1;
        const representante = unidad.objetos[0];
        if (!representante) return null;
        const seleccionada = unidad.objetos.some((o) =>
          seleccionadosIds.includes(o.id),
        );
        const oculta = unidad.objetos.every((o) => !o.visible);
        const ids = unidad.objetos.map((o) => o.id);

        return (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- fila de lista arrastrable para reordenar (drag&drop nativo); la selección en sí ya es un <button> interactivo adentro.
          <li
            key={unidad.id}
            draggable
            onDragStart={() => setArrastrando(unidad.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastrando) moverUnidad(arrastrando, unidad.id);
              setArrastrando(null);
            }}
            onDragEnd={() => setArrastrando(null)}
            className={clsx(
              "flex cursor-grab items-center gap-2 rounded-[var(--radius-sm)] border p-1.5 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] active:cursor-grabbing",
              seleccionada
                ? "border-blue bg-blue-soft"
                : "border-border hover:bg-navy-soft",
              arrastrando === unidad.id && "opacity-50",
            )}
          >
            <button
              type="button"
              onClick={(e) => onSeleccionar(representante.id, e.shiftKey)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              title={
                unidad.objetos.map((o) => o.nombre).join(" + ") +
                (excedeArea(representante)
                  ? " (fuera del área de trabajo)"
                  : "")
              }
            >
              <span className="bg-navy-soft relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-xs)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de un asset arbitrario ya en memoria (SVG o raster) */}
                <img
                  src={fuenteDe(representante)}
                  alt=""
                  className="max-h-full max-w-full"
                />
                {esGrupo ? (
                  <span className="bg-blue absolute right-0 bottom-0 rounded-tl-[var(--radius-xs)] px-1 text-[9px] font-semibold text-white">
                    {unidad.objetos.length}
                  </span>
                ) : null}
              </span>
              <span className="text-navy min-w-0 flex-1 truncate text-xs font-medium">
                {esGrupo
                  ? `Grupo (${unidad.objetos.map((o) => o.nombre).join(", ")})`
                  : representante.nombre}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onCambiarVisibilidad(ids, oculta)}
              aria-label={oculta ? "Mostrar capa" : "Ocultar capa"}
              aria-pressed={!oculta}
              title={
                oculta
                  ? "Oculta -- no se exporta"
                  : "Visible -- se incluye al exportar"
              }
              className={iconButtonClasses()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={clsx("size-4", oculta && "opacity-40")}
                aria-hidden="true"
              >
                <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.5" />
                {oculta ? <line x1="3" y1="21" x2="21" y2="3" /> : null}
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onEliminar(ids)}
              aria-label={
                esGrupo ? "Eliminar grupo" : `Eliminar ${representante.nombre}`
              }
              className={iconButtonClasses("danger")}
            >
              <TrashCanAnimado className="size-3.5" strokeWidth={2} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
