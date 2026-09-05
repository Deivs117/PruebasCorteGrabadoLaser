import { Atom, Layers, Magnet, TreePine, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import type { CardAccent } from "@/components/ui/card";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";

const ICONO_FAMILIA: Record<FamiliaMaterial, LucideIcon> = {
  madera: TreePine,
  polimero: Atom,
  metal: Magnet,
  otro: Layers,
};

const FONDO_POR_COLOR: Record<CardAccent, string> = {
  blue: "bg-blue-soft text-blue",
  teal: "bg-teal-soft text-teal",
  orange: "bg-orange-soft text-orange",
  purple: "bg-purple-soft text-purple",
  navy: "bg-navy-soft text-navy",
};

interface MaterialIconProps {
  /** Nombre del material — no se muestra como texto, pero queda accesible
   * (aria-label/title) para no perder la información al quitar el título
   * grande de cada tarjeta. */
  material: string;
  familia: FamiliaMaterial;
  color: CardAccent;
  className?: string;
}

/** Identidad visual de un material: forma = familia (madera/polímero/metal),
 * color = el material puntual (ver `colorDeMaterial`) — dos clasificaciones
 * independientes en un solo ícono. */
export function MaterialIcon({
  material,
  familia,
  color,
  className,
}: MaterialIconProps) {
  const Icono = ICONO_FAMILIA[familia];
  return (
    <span
      role="img"
      aria-label={material}
      title={material}
      className={clsx(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
        FONDO_POR_COLOR[color],
        className,
      )}
    >
      <Icono className="size-3.5" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
