import { AyudaLink } from "@/components/ui/ayuda-link";
import { LinkButton } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarGruposCalibracion()`. El encabezado y el botón "Nueva Final Run"
 * son estáticos; la grilla de grupos de calibración se marca como skeleton
 * (cada card real trae además una lista de ejecuciones, que acá no se
 * calca 1:1 — su cantidad depende del grupo).
 */
export default function CargandoFinalRun() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">
            Final Run (Calibración)
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Una combinación fija de parámetros, repetida en ejecuciones
            independientes, hasta calibrar su energía real.
          </p>
          <AyudaLink seccion="final-run" />
        </div>
        <LinkButton href="/final-run/nueva" variant="primary">
          Nueva Final Run
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
