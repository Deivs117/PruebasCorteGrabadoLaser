"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_SECTIONS } from "@/lib/nav";
import { LogoEmpresa } from "@/components/layout/logo-empresa";
import { Tooltip } from "@/components/ui/tooltip";

interface SidebarProps {
  /** `true` = panel expandido con labels. `false`: en viewports angostos
   * (`< lg`) se oculta del todo (panel deslizante, comportamiento sin
   * cambios); en viewports anchos se COLAPSA a una franja angosta de solo
   * íconos (#114, patrón Gemini) en vez de desaparecer — nunca se pierde
   * la referencia visual de la navegación en escritorio. */
  open: boolean;
  onNavigate: () => void;
}

/**
 * Navegación principal de la app. El mismo <nav> sirve para los tres casos
 * (expandido, colapsado a íconos, oculto en mobile) — nunca una versión
 * "mobile"/"colapsada" separada.
 */
export function Sidebar({ open, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex w-[var(--shell-sidebar-w)] flex-col overflow-y-auto",
        "bg-navy text-white transition-[width,transform] duration-[var(--duration-slow)] ease-[var(--ease-motion)]",
        // En mobile, `open=false` oculta el panel entero (sin cambios). En
        // escritorio (`lg:`) el panel siempre está visible -- `open=false`
        // solo lo angosta a la franja de íconos, ver `w-` de abajo.
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        !open && "lg:w-[var(--shell-sidebar-w-collapsed)]",
      )}
    >
      <div className="flex h-[var(--shell-topbar-h)] shrink-0 items-center gap-2.5 overflow-hidden px-6">
        <LogoEmpresa className="size-6 shrink-0" />
        {open ? (
          <span className="truncate text-lg font-semibold tracking-tight">
            Laser Toolkit
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-6 px-3 pb-6">
        {NAV_SECTIONS.map((seccion, indice) => (
          <ul
            key={seccion.titulo ?? `seccion-${indice}`}
            className="flex flex-col gap-1"
          >
            {seccion.titulo && open ? (
              <li aria-hidden="true">
                <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/40 uppercase">
                  {seccion.titulo}
                </p>
              </li>
            ) : null}
            {seccion.items.map((item) => {
              const activo = pathname === item.href;
              const Icon = item.icon;
              const enlace = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={activo ? "page" : undefined}
                  aria-label={open ? undefined : item.label}
                  className={clsx(
                    "group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium",
                    "transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                    !open && "lg:justify-center lg:px-0",
                    activo
                      ? "bg-blue text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                  {/* Con panel colapsado, el label sigue en el DOM para
                      mobile (que siempre muestra el panel expandido) --
                      solo se esconde visualmente en escritorio, el
                      `aria-label` de arriba cubre la accesibilidad ahí. */}
                  <span className={clsx("truncate", !open && "lg:hidden")}>
                    {item.label}
                  </span>
                </Link>
              );
              return (
                <li key={item.href}>
                  {open ? (
                    enlace
                  ) : (
                    <Tooltip label={item.label}>{enlace}</Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </nav>
  );
}
