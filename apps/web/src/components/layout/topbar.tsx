"use client";

import { usePathname } from "next/navigation";
import { MorphIcon } from "morphicons/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide";
import { getNavLabel } from "@/lib/nav";

interface TopbarProps {
  sidebarAbierto: boolean;
  onToggleSidebar: () => void;
}

/**
 * Barra superior: título de la sección activa + control del sidebar,
 * visible en cualquier ancho de pantalla (antes solo existía en viewports
 * angostos, así que en escritorio no había forma de esconder el sidebar).
 */
export function Topbar({ sidebarAbierto, onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const titulo = getNavLabel(pathname);

  return (
    <header className="border-border bg-surface sticky top-0 z-30 flex h-[var(--shell-topbar-h)] shrink-0 items-center gap-4 border-b px-4 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-expanded={sidebarAbierto}
        aria-label={
          sidebarAbierto ? "Ocultar navegación" : "Mostrar navegación"
        }
        className="text-navy hover:bg-navy-soft flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
      >
        <MorphIcon
          icon={sidebarAbierto ? PanelLeftClose : PanelLeftOpen}
          spring="smooth"
          size={20}
          strokeWidth={1.75}
        />
      </button>

      {/* Etiqueta de la sección activa, no el <h1> de la página: cada
          página define su propio encabezado principal en su contenido. */}
      <p className="text-navy text-base font-semibold">{titulo}</p>
    </header>
  );
}
