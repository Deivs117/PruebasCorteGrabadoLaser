import { AyudaLink } from "@/components/ui/ayuda-link";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarHistorial()` + `leerCatalogoMateriales()`. El encabezado es
 * estático; la grilla de corridas se marca como skeleton.
 */
export default function CargandoHistorial() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Historial</h1>
        <p className="text-text-muted mt-1 text-sm">
          Resumen de todas las corridas hechas en el taller, de solo lectura —
          para completar o costear una corrida, andá a Hoja de Registro.
        </p>
        <AyudaLink seccion="historial" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
