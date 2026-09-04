import Link from "next/link";
import { clsx } from "clsx";
import { Card } from "@/components/ui/card";
import { EliminarSvgButton } from "@/components/grabado-svg/eliminar-svg-button";
import { svgADataUri } from "@/lib/svg-data-uri";
import { tiempoRelativo } from "@/lib/tiempo-relativo";

interface ItemGaleria {
  nombre: string;
  contenido: string;
  subidoEn: string;
}

interface SvgGaleriaProps {
  items: ItemGaleria[];
  seleccionado?: string;
}

export function SvgGaleria({ items, seleccionado }: SvgGaleriaProps) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-navy text-base font-semibold">SVGs guardados</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => {
          const activo = item.nombre === seleccionado;
          return (
            <Card
              key={item.nombre}
              data-eliminable
              className={clsx(
                "flex flex-col gap-2 p-3",
                activo ? "border-blue" : undefined,
              )}
            >
              <Link
                href={`/grabado-svg?svg=${encodeURIComponent(item.nombre)}`}
                className="flex flex-col gap-2"
              >
                <div className="bg-navy-soft hover:bg-blue-soft flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de un SVG arbitrario, servida como data URI */}
                  <img
                    src={svgADataUri(item.contenido)}
                    alt={`Miniatura de ${item.nombre}`}
                    className="max-h-full max-w-full p-2"
                  />
                </div>
                <p className="text-text-muted text-xs">
                  {tiempoRelativo(item.subidoEn)}
                </p>
              </Link>
              <div className="flex justify-end">
                <EliminarSvgButton nombre={item.nombre} seleccionado={activo} />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
