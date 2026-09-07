import { AyudaLink } from "@/components/ui/ayuda-link";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarMaterialesConDatos()` (catálogo + suites + lectura de fichas
 * técnicas en disco). El encabezado es estático; el selector de "agregar
 * material" y la grilla se marcan como skeleton.
 */
export default function CargandoMateriales() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Materiales</h1>
        <p className="text-text-muted mt-1 text-sm">
          Espesores y operaciones se derivan automáticamente de las suites ya
          corridas — nunca se cargan a mano.
        </p>
        <AyudaLink seccion="materiales" />
      </div>

      <Skeleton className="h-9 w-full max-w-sm" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
