import {
  BarChart3,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  FileBadge,
  FlaskConical,
  Gauge,
  HelpCircle,
  History,
  Home,
  Layers,
  Settings2,
  Shapes,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  titulo?: string;
  items: NavItem[];
}

/**
 * Estructura de navegación de la app, según docs/ui-design/prompts-stitch.md
 * (Prompt 0). Cada ruta existe como página real, aunque varias todavía sean
 * placeholders mientras se construyen (ver docs/ui-design/reglas-frontend-basics.md:
 * nunca un <a> o <button> que no lleve a algo real).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/", label: "Inicio", icon: Home }],
  },
  {
    titulo: "Pruebas",
    items: [
      { href: "/suites", label: "Suites de Prueba", icon: FlaskConical },
      { href: "/grabado-svg", label: "Grabado Vectorial (SVG)", icon: Shapes },
      { href: "/registro", label: "Hoja de Registro", icon: ClipboardList },
      { href: "/costeo", label: "Costeo", icon: Calculator },
      { href: "/final-run", label: "Final Run (Calibración)", icon: Gauge },
    ],
  },
  {
    titulo: "Referencia",
    items: [
      { href: "/fichas", label: "Fichas de Parámetro", icon: FileBadge },
      { href: "/materiales", label: "Materiales", icon: Layers },
      { href: "/maquina", label: "Máquina", icon: Settings2 },
    ],
  },
  {
    titulo: "Datos",
    items: [
      { href: "/historial", label: "Historial", icon: History },
      { href: "/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/tarifas", label: "Tarifas", icon: CircleDollarSign },
    ],
  },
  {
    items: [{ href: "/ayuda", label: "Ayuda", icon: HelpCircle }],
  },
];

export function getNavLabel(pathname: string): string {
  for (const seccion of NAV_SECTIONS) {
    for (const item of seccion.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return "Laser Toolkit";
}
