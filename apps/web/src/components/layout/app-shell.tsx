"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface AppShellProps {
  children: React.ReactNode;
  /** Email de la sesión activa, o `null` sin sesión (issue #52) -- resuelto
   * server-side en `layout.tsx`, nunca acá (evita un round-trip extra al
   * cliente solo para mostrarlo en el Topbar). */
  userEmail: string | null;
}

/** `/login` no lleva sidebar/topbar -- es la única página pública (issue
 * #52), y muestra su propio layout centrado. */
function esRutaPublica(pathname: string): boolean {
  return pathname === "/login";
}

const CLAVE_PREFERENCIA = "laser-toolkit:sidebar-abierto";
const CONSULTA_ANGOSTO = "(max-width: 1023px)";

function esViewportAngosto(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia(CONSULTA_ANGOSTO).matches
  );
}

/**
 * Estructura general: sidebar + topbar + contenido. En escritorio, el
 * sidebar nunca desaparece del todo: `sidebarAbierto=false` lo colapsa a
 * una franja angosta de solo íconos (#114, patrón Gemini) en vez de
 * ocultarlo. En viewports angostos sigue actuando como panel deslizante con
 * fondo oscurecido (transform + fade, nunca un display:none/block
 * instantáneo) que sí se oculta del todo.
 */
export function AppShell({ children, userEmail }: AppShellProps) {
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const pathname = usePathname();
  const rutaPublica = esRutaPublica(pathname);

  // Antes del primer paint: aplicar la preferencia guardada, para no
  // mostrar el sidebar abierto un instante y recién después cerrarlo.
  useLayoutEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_PREFERENCIA);
      // No se puede leer localStorage durante el render (rompería el SSR:
      // el servidor no tiene acceso a él) ni derivarlo en el estado inicial
      // por la misma razón — por eso el ajuste vive en un efecto, a
      // propósito, en vez de resolverse durante el render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado !== null) setSidebarAbierto(guardado === "true");
    } catch {
      // localStorage no disponible (modo privado, etc.): queda el default.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PREFERENCIA, String(sidebarAbierto));
    } catch {
      // no persistir la preferencia no bloquea la funcionalidad.
    }
  }, [sidebarAbierto]);

  // Cerrar el panel deslizante al cambiar de ruta, pero solo en viewports
  // angostos: en escritorio el sidebar es parte fija del layout y no debe
  // colapsarse solo porque el operario navegó a otra sección. Se ajusta el
  // estado durante el render (no en un efecto) siguiendo el patrón de React
  // para "resetear estado cuando cambia una prop".
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    if (esViewportAngosto()) setSidebarAbierto(false);
  }

  function cerrarSiEsAngosto() {
    if (esViewportAngosto()) setSidebarAbierto(false);
  }

  // Recién acá, después de llamar todos los hooks siempre en el mismo
  // orden (regla de los Hooks) -- "cerrar sesión" navega de una página con
  // shell a /login sin desmontar este componente, así que el temprano
  // return no puede saltearse hooks condicionalmente.
  if (rutaPublica) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        open={sidebarAbierto}
        onNavigate={cerrarSiEsAngosto}
        onToggle={() => setSidebarAbierto((v) => !v)}
      />

      <button
        type="button"
        aria-label="Cerrar navegación"
        onClick={() => setSidebarAbierto(false)}
        className={clsx(
          "bg-navy/40 fixed inset-0 z-30 backdrop-blur-[1px] transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-motion)] lg:hidden",
          sidebarAbierto ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        className={clsx(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-[var(--duration-slow)] ease-[var(--ease-motion)]",
          // El sidebar siempre está visible en escritorio (#114) -- ya sea
          // expandido o colapsado a la franja de íconos, nunca en 0.
          sidebarAbierto
            ? "lg:pl-[var(--shell-sidebar-w)]"
            : "lg:pl-[var(--shell-sidebar-w-collapsed)]",
        )}
      >
        <Topbar
          onAbrirSidebar={() => setSidebarAbierto(true)}
          userEmail={userEmail}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
