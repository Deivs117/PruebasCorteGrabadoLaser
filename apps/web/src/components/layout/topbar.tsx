"use client";

import { usePathname } from "next/navigation";
import { PanelLeftOpen } from "lucide-react";
import { getNavLabel } from "@/lib/nav";
import { CerrarSesionButton } from "@/components/auth/cerrar-sesion-button";

interface TopbarProps {
  /** Solo hace falta para el botón de abrir en mobile -- en escritorio el
   * control de colapsar/expandir vive en el propio `Sidebar` (#114). */
  onAbrirSidebar: () => void;
  /** Email de la sesión activa (issue #52), o `null` si por algún motivo
   * el shell se renderiza sin sesión (no debería pasar: el middleware ya
   * redirige a /login antes). */
  userEmail: string | null;
}

/**
 * Barra superior: título de la sección activa + (solo en mobile) el botón
 * para abrir el panel deslizante -- en escritorio el sidebar nunca
 * desaparece del todo, así que ahí no hace falta ningún botón acá (#114,
 * el control de colapsar/expandir vive en el propio `Sidebar`).
 */
export function Topbar({ onAbrirSidebar, userEmail }: TopbarProps) {
  const pathname = usePathname();
  const titulo = getNavLabel(pathname);

  return (
    <header className="border-border bg-surface sticky top-0 z-30 flex h-[var(--shell-topbar-h)] shrink-0 items-center gap-4 border-b px-4 sm:px-6">
      <button
        type="button"
        onClick={onAbrirSidebar}
        aria-label="Abrir navegación"
        className="text-navy hover:bg-navy-soft flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] lg:hidden"
      >
        <PanelLeftOpen size={20} strokeWidth={1.75} />
      </button>

      {/* Etiqueta de la sección activa, no el <h1> de la página: cada
          página define su propio encabezado principal en su contenido. */}
      <p className="text-navy text-base font-semibold">{titulo}</p>

      {userEmail ? (
        <div className="ml-auto flex items-center gap-3">
          <p className="text-text-muted hidden text-xs sm:block">{userEmail}</p>
          <CerrarSesionButton />
        </div>
      ) : null}
    </header>
  );
}
