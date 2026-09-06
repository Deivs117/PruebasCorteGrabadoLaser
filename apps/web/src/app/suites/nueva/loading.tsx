import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { SkeletonField } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve la
 * galería de SVGs + el catálogo de materiales para el `SuiteWizard`. El
 * título real depende de `searchParams.duplicar` (título "Duplicar suite de
 * prueba" en ese caso) — acá se usa el caso más común, "Nueva suite de
 * prueba", ya que el ajuste es cosmético y desaparece apenas resuelve.
 */
export default function CargandoNuevaSuite() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/suites" label="Volver a Suites de Prueba" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">
          Nueva suite de prueba
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          Configurá el barrido paso a paso y generá su G-code al final.
        </p>
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      </Card>
    </div>
  );
}
