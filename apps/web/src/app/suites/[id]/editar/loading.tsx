import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { SkeletonField } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `leerSuiteParaFormulario()` + la galería de SVGs + el catálogo de
 * materiales, todo lo que el `SuiteWizard` necesita para precargarse. El
 * encabezado es estático; el wizard se marca como una tanda genérica de
 * campos (su forma real cambia según el paso, así que no se calca 1:1).
 */
export default function CargandoEditarSuite() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/suites" label="Volver a Suites de Prueba" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">Editar suite</h1>
        <p className="text-text-muted mt-1 text-sm">
          Los cambios regeneran el G-code de esta suite — la máquina va a correr
          la versión actualizada.
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
