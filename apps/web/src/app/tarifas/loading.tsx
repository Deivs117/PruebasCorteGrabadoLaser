import { AyudaLink } from "@/components/ui/ayuda-link";
import { Card } from "@/components/ui/card";
import { SkeletonField } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `leerTarifas()` para precargar el `TarifasForm`. El encabezado es
 * estático; el formulario se marca como una tanda genérica de campos
 * (tarifa eléctrica, hora-máquina, y una fila de precio de material).
 */
export default function CargandoTarifas() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Tarifas</h1>
        <p className="text-text-muted mt-1 text-sm">
          El único lugar con valores monetarios: tarifa eléctrica, tarifa
          hora-máquina y precio de material. Mientras un campo quede vacío,
          Costeo lo muestra como pendiente — nunca asume un número.
        </p>
        <AyudaLink seccion="tarifas" />
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonField />
          <SkeletonField />
        </div>
        <div className="border-border grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      </Card>
    </div>
  );
}
