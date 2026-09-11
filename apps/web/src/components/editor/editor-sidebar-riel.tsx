"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { iconButtonClasses } from "@/lib/button-styles";
import { LayersAnimado } from "@/components/ui/icons/layers-animado";
import { UploadCloudAnimado } from "@/components/ui/icons/upload-cloud-animado";
import { XAnimado } from "@/components/ui/icons/x-animado";
import type { IconComponent } from "@/lib/nav";

export type PanelSidebarId = "subir" | "capas";

interface ItemRiel {
  id: PanelSidebarId;
  label: string;
  icon: IconComponent;
}

const ITEMS: ItemRiel[] = [
  { id: "subir", label: "Subir archivo", icon: UploadCloudAnimado },
  { id: "capas", label: "Capas", icon: LayersAnimado },
];

interface EditorSidebarRielProps {
  panelAbierto: PanelSidebarId | null;
  onCambiarPanel: (panel: PanelSidebarId | null) => void;
  contenidoSubir: ReactNode;
  contenidoCapas: ReactNode;
}

/**
 * Riel de íconos + panel desplegable (issue #178) -- patrón Canva: un riel
 * angosto siempre visible (solo íconos) y, al tocar uno, un panel ancho se
 * despliega ENCIMA del lienzo (overlay, no empuja) con el contenido de esa
 * herramienta. Nunca hay más de un panel abierto a la vez -- tocar el mismo
 * ícono lo cierra, tocar otro lo reemplaza.
 *
 * Overlay a propósito (no "push"): el contenedor del `Stage` de Konva
 * (`contenedorRef` en `editor-lienzo.tsx`) nunca cambia de tamaño al abrir/
 * cerrar este panel, así que abrir/cerrar "Subir" o "Capas" nunca dispara
 * un recálculo del canvas -- a diferencia del panel de propiedades de la
 * derecha (`PanelObjeto`), que si empuja porque se usa en simultáneo con el
 * lienzo mientras editás un objeto.
 *
 * El ícono "Capas" queda con contenido placeholder hasta el issue de
 * seguimiento (panel de capas real: miniatura, reordenar, visibilidad) --
 * la estructura del riel+panel nace acá para no rehacerla dos veces.
 */
export function EditorSidebarRiel({
  panelAbierto,
  onCambiarPanel,
  contenidoSubir,
  contenidoCapas,
}: EditorSidebarRielProps) {
  const itemActivo = ITEMS.find((item) => item.id === panelAbierto) ?? null;
  const contenido =
    panelAbierto === "subir"
      ? contenidoSubir
      : panelAbierto === "capas"
        ? contenidoCapas
        : null;

  return (
    <div className="relative flex shrink-0">
      <nav
        aria-label="Herramientas del editor"
        className="border-border bg-surface z-10 flex w-16 shrink-0 flex-col items-center gap-1 border-r py-3"
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const activo = panelAbierto === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={activo}
              onClick={() => onCambiarPanel(activo ? null : item.id)}
              className={clsx(
                "flex size-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] text-[10px] font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                activo
                  ? "bg-blue-soft text-blue"
                  : "text-text-muted hover:bg-navy-soft hover:text-navy",
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {item.label.split(" ")[0]}
            </button>
          );
        })}
      </nav>

      {panelAbierto ? (
        <div className="border-border bg-surface absolute top-0 bottom-0 left-16 z-20 flex w-80 flex-col gap-3 overflow-y-auto border-r p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-navy text-sm font-semibold">
              {itemActivo?.label}
            </p>
            <button
              type="button"
              aria-label="Cerrar panel"
              onClick={() => onCambiarPanel(null)}
              className={iconButtonClasses()}
            >
              <XAnimado className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          {contenido}
        </div>
      ) : null}
    </div>
  );
}
