import { AyudaLink } from "@/components/ui/ayuda-link";
import { LinkButton } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarSuites()` + `leerCatalogoMateriales()`. El encabezado y el botón
 * "Nueva suite de prueba" son estáticos; la grilla de suites se marca como
 * skeleton (ver `SuitesListado`).
 */
export default function CargandoSuitesDePrueba() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Suites de Prueba</h1>
          <p className="text-text-muted mt-1 text-sm">
            Cada suite es un barrido de velocidad y potencia listo para correr
            en la máquina.
          </p>
          <AyudaLink seccion="suites" />
        </div>
        <LinkButton href="/suites/nueva" variant="primary">
          Nueva suite de prueba
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
