import { clsx } from "clsx";
import { LinkButton } from "@/components/ui/button";
import { svgADataUri } from "@/lib/svg-data-uri";

interface SvgDisponible {
  nombre: string;
  contenido: string;
}

interface SvgPickerProps {
  disponibles: SvgDisponible[];
  /** Ruta completa ya guardada (ej. "data/svgs/logo-xyz.svg"), tal como
   * queda en `svg_path` — no solo el nombre de archivo. */
  seleccionado: string;
  onSeleccionar: (rutaCompleta: string) => void;
}

/** Elegir uno de los SVGs ya subidos en Grabado Vectorial — nunca sube un
 * archivo nuevo desde acá, para no duplicar esa funcionalidad. Si la suite
 * ya apuntaba a un SVG que no está en esta galería (ej. uno versionado en
 * assets/svg/), no se resalta ningún thumbnail, pero esa referencia no se
 * toca a menos que el técnico elija uno nuevo acá. */
export function SvgPicker({
  disponibles,
  seleccionado,
  onSeleccionar,
}: SvgPickerProps) {
  if (disponibles.length === 0) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed p-6 text-center">
        <p className="text-text-muted text-sm">
          Todavía no subiste ningún SVG.
        </p>
        <LinkButton href="/grabado-svg" variant="outline">
          Subir un SVG
        </LinkButton>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="SVG a usar en cada celda"
      className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6"
    >
      {disponibles.map((svg) => {
        const rutaCompleta = `data/svgs/${svg.nombre}`;
        const activo = rutaCompleta === seleccionado;
        return (
          <button
            key={svg.nombre}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onSeleccionar(rutaCompleta)}
            className={clsx(
              "bg-navy-soft flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border-2 p-2 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
              activo
                ? "border-blue bg-blue-soft"
                : "hover:bg-border border-transparent",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de un SVG arbitrario, servida como data URI */}
            <img
              src={svgADataUri(svg.contenido)}
              alt={`Usar ${svg.nombre}`}
              className="max-h-full max-w-full"
            />
          </button>
        );
      })}
    </div>
  );
}
