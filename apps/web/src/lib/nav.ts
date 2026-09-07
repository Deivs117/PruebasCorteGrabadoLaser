import { BarChart3Animado } from "@/components/ui/icons/bar-chart3-animado";
import { CalculatorAnimado } from "@/components/ui/icons/calculator-animado";
import { CircleDollarSignAnimado } from "@/components/ui/icons/circle-dollar-sign-animado";
import { ClipboardListAnimado } from "@/components/ui/icons/clipboard-list-animado";
import { FileBadgeAnimado } from "@/components/ui/icons/file-badge-animado";
import { FlaskConicalAnimado } from "@/components/ui/icons/flask-conical-animado";
import { GaugeAnimado } from "@/components/ui/icons/gauge-animado";
import { HelpCircleAnimado } from "@/components/ui/icons/help-circle-animado";
import { HistoryAnimado } from "@/components/ui/icons/history-animado";
import { HomeAnimado } from "@/components/ui/icons/home-animado";
import { KeyRoundAnimado } from "@/components/ui/icons/key-round-animado";
import { LayersAnimado } from "@/components/ui/icons/layers-animado";
import { Settings2Animado } from "@/components/ui/icons/settings2-animado";
import { ShapesAnimado } from "@/components/ui/icons/shapes-animado";
import { SquareAnimado } from "@/components/ui/icons/square-animado";

export interface IconProps {
  className?: string;
  strokeWidth?: number;
}

export type IconComponent = (props: IconProps) => React.JSX.Element;

export interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
}

export interface NavSection {
  titulo?: string;
  items: NavItem[];
}

/**
 * Estructura de navegación de la app, según docs/ui-design/prompts-stitch.md
 * (Prompt 0). Cada ruta existe como página real, aunque varias todavía sean
 * placeholders mientras se construyen (ver apps/web/docs/reglas-frontend-basics.md:
 * nunca un <a> o <button> que no lleve a algo real).
 *
 * Los íconos son las versiones animadas propias (ver components/ui/icons/ y
 * docs/ui-design/propuesta-iconos-animados.md), no `lucide-react` directo --
 * Sidebar ya lleva la clase "group" en cada <Link>, así que reaccionan al
 * hover del ítem completo.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/", label: "Inicio", icon: HomeAnimado }],
  },
  {
    titulo: "Pruebas",
    items: [
      { href: "/suites", label: "Suites de Prueba", icon: FlaskConicalAnimado },
      {
        href: "/grabado-svg",
        label: "Grabado Vectorial (SVG)",
        icon: ShapesAnimado,
      },
      {
        href: "/registro",
        label: "Hoja de Registro",
        icon: ClipboardListAnimado,
      },
      { href: "/costeo", label: "Costeo", icon: CalculatorAnimado },
      {
        href: "/final-run",
        label: "Final Run (Calibración)",
        icon: GaugeAnimado,
      },
    ],
  },
  {
    // Producción consume Fichas ya aprobadas, nunca alimenta el pipeline de
    // pruebas de arriba (#3) -- por eso vive en su propia sección, no
    // adentro de "Pruebas".
    titulo: "Producción",
    items: [
      { href: "/editor", label: "Editor de Diseño", icon: SquareAnimado },
    ],
  },
  {
    titulo: "Referencia",
    items: [
      {
        href: "/fichas",
        label: "Fichas de Parámetro",
        icon: FileBadgeAnimado,
      },
      { href: "/materiales", label: "Materiales", icon: LayersAnimado },
      { href: "/maquina", label: "Máquina", icon: Settings2Animado },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { href: "/historial", label: "Historial", icon: HistoryAnimado },
      { href: "/reportes", label: "Reportes", icon: BarChart3Animado },
      {
        href: "/tarifas",
        label: "Tarifas",
        icon: CircleDollarSignAnimado,
      },
    ],
  },
  {
    items: [{ href: "/ayuda", label: "Ayuda", icon: HelpCircleAnimado }],
  },
];

/** Ítem del Panel de Generación de Credenciales (#117) -- nunca parte de
 * `NAV_SECTIONS` a secas: solo aparece para la cuenta maestra (ver
 * `navSections`), la misma condición que protege la ruta en sí
 * (`app/admin/page.tsx`). */
const ITEM_ADMIN: NavItem = {
  href: "/admin",
  label: "Generar Credenciales",
  icon: KeyRoundAnimado,
};

/** "Mi cuenta" (#117) no vive en el sidebar -- se llega desde el ícono del
 * Topbar, junto al email de la sesión -- pero sigue necesitando label para
 * el título de la sección activa (`getNavLabel`). */
const LABELS_FUERA_DEL_SIDEBAR: Record<string, string> = {
  "/cuenta": "Mi cuenta",
  [ITEM_ADMIN.href]: ITEM_ADMIN.label,
};

/** Secciones a renderizar en el sidebar para esta sesión -- `NAV_SECTIONS`
 * más "Administración" si la cuenta activa es la cuenta maestra (#117).
 * El link nunca aparece para nadie más, mismo gate que la propia ruta. */
export function navSections(esCuentaMaestra: boolean): NavSection[] {
  if (!esCuentaMaestra) return NAV_SECTIONS;
  return [...NAV_SECTIONS, { titulo: "Administración", items: [ITEM_ADMIN] }];
}

export function getNavLabel(pathname: string): string {
  for (const seccion of NAV_SECTIONS) {
    for (const item of seccion.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return LABELS_FUERA_DEL_SIDEBAR[pathname] ?? "Laser Toolkit";
}
