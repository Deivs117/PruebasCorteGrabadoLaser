"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_SECTIONS } from "@/lib/nav";

interface SidebarProps {
  /** Controla si el panel está desplegado, en cualquier ancho de pantalla. */
  open: boolean;
  onNavigate: () => void;
}

/**
 * Navegación principal de la app. Se puede ocultar en cualquier ancho de
 * pantalla (AppShell decide cuándo cerrarla sola al navegar: solo en
 * viewports angostos, donde además actúa como panel deslizante) — el mismo
 * <nav>, no una versión "mobile" separada.
 */
export function Sidebar({ open, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex w-[var(--shell-sidebar-w)] flex-col overflow-y-auto",
        "bg-navy text-white transition-transform duration-[var(--duration-slow)] ease-[var(--ease-motion)]",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-[var(--shell-topbar-h)] shrink-0 items-center px-6">
        <span className="text-lg font-semibold tracking-tight">
          Laser Toolkit
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-3 pb-6">
        {NAV_SECTIONS.map((seccion, indice) => (
          <ul
            key={seccion.titulo ?? `seccion-${indice}`}
            className="flex flex-col gap-1"
          >
            {seccion.titulo ? (
              <li aria-hidden="true">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/40 uppercase">
                  {seccion.titulo}
                </p>
              </li>
            ) : null}
            {seccion.items.map((item) => {
              const activo = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={activo ? "page" : undefined}
                    className={clsx(
                      "group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium",
                      "transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                      activo
                        ? "bg-blue text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </nav>
  );
}
