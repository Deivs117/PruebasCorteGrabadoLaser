import { AyudaLink } from "@/components/ui/ayuda-link";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Next.js muestra esto al instante en la navegación (vía Suspense) mientras
 * `page.tsx` resuelve `listarRegistros()` + `leerCatalogoMateriales()` —
 * ambos con latencia real de Supabase — y lo reemplaza por el contenido real
 * apenas está listo. El encabezado es estático (no depende del fetch), así
 * que se repite tal cual; solo la grilla de corridas se marca como skeleton.
 */
export default function CargandoHojaDeRegistro() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
        <p className="text-text-muted mt-1 text-sm">
          Evaluación celda por celda de las corridas que ya se corrieron en la
          máquina.
        </p>
        <AyudaLink seccion="registro" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
