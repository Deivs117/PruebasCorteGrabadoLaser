import { AyudaLink } from "@/components/ui/ayuda-link";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `getDashboardSummary()` y (si hay tarifas) `listarCosteables()`. El
 * encabezado es estático y se repite en ambas ramas de `page.tsx`; la
 * grilla de corridas costeables se marca como skeleton — si al resolver
 * resulta que faltan tarifas, el contenido real la reemplaza por el estado
 * vacío correspondiente.
 */
export default function CargandoCosteo() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Costeo</h1>
        <p className="text-text-muted mt-1 text-sm">
          Costo real por celda (energía, material, tiempo de máquina), a partir
          de una Hoja de Registro completada.
        </p>
        <AyudaLink seccion="costeo" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
