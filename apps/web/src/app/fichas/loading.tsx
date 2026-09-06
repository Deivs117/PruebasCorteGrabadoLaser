import { AyudaLink } from "@/components/ui/ayuda-link";
import { LinkButton } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarFichas()`. El encabezado y el botón "Nueva Ficha" son estáticos;
 * el grid de fichas se marca como skeleton.
 */
export default function CargandoFichasDeParametro() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">
            Fichas de Parámetro Estándar
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Las &quot;recetas&quot; oficiales por material, espesor y operación,
            respaldadas por un Final Run calibrado.
          </p>
          <AyudaLink seccion="fichas" />
        </div>
        <LinkButton href="/fichas/nueva" variant="primary">
          Nueva Ficha
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
