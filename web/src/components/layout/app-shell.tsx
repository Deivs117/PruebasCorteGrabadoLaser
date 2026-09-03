"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Estructura general: sidebar + topbar + contenido. En viewports angostos el
 * sidebar es un panel deslizante con fondo oscurecido de fondo (transform +
 * fade, nunca un display:none/block instantáneo).
 */
export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  // Cerrar el panel deslizante al cambiar de ruta: se ajusta el estado
  // durante el render (no en un efecto) siguiendo el patrón de React para
  // "resetear estado cuando cambia una prop" — ver react.dev/learn/you-might-not-need-an-effect.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <button
        type="button"
        aria-label="Cerrar navegación"
        onClick={() => setMenuOpen(false)}
        className={clsx(
          "bg-navy/40 fixed inset-0 z-30 backdrop-blur-[1px] transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-motion)] lg:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[var(--shell-sidebar-w)]">
        <Topbar
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
