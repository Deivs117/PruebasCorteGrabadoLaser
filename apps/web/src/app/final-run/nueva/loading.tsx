import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { SkeletonField } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarCandidatos()` para precargar el `FinalRunForm`. El encabezado es
 * estático; el formulario se marca como una tanda genérica de campos.
 */
export default function CargandoNuevaFinalRun() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/final-run" label="Volver a Final Run" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">Nueva Final Run</h1>
        <p className="text-text-muted mt-1 text-sm">
          Fijá la combinación de velocidad y potencia ya elegida para producción
          — esta primera ejecución arranca el grupo de calibración.
        </p>
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonField />
          <SkeletonField />
        </div>
      </Card>
    </div>
  );
}
