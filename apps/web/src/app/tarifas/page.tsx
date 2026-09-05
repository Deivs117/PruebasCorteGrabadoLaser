import { TarifasForm } from "@/components/tarifas/tarifas-form";
import { leerTarifas } from "@/lib/tarifas-data";

// Las tarifas se editan en cualquier momento (por el área financiera), así
// que esta página no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function Tarifas() {
  const tarifas = await leerTarifas();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Tarifas</h1>
        <p className="text-text-muted mt-1 text-sm">
          El único lugar con valores monetarios: tarifa eléctrica, tarifa
          hora-máquina y precio de material. Mientras un campo quede vacío,
          Costeo lo muestra como pendiente — nunca asume un número.
        </p>
      </div>
      <TarifasForm inicial={tarifas} />
    </div>
  );
}
