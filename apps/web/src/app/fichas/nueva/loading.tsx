import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { SkeletonField } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarGruposCalibracion()` para el selector de grupo. El encabezado es
 * estático; el formulario se marca como una tanda genérica de campos.
 */
export default function CargandoNuevaFicha() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/fichas" label="Volver a Fichas de Parámetro" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">Nueva Ficha</h1>
        <p className="text-text-muted mt-1 text-sm">
          Certificá un grupo de calibración como la combinación oficial de
          producción para ese material, espesor y operación.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <SkeletonField />
          <SkeletonField />
        </Card>
        <Card className="flex flex-col gap-4 p-6">
          <SkeletonField />
          <SkeletonField />
        </Card>
      </div>
    </div>
  );
}
