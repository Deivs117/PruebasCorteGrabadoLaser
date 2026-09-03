import { BackLink } from "@/components/ui/back-link";
import { SuiteWizard } from "@/components/suites/suite-wizard";
import { listarSvgsConContenido } from "@/lib/svg-data";

// La galería de SVGs disponibles cambia en cualquier momento desde Grabado
// Vectorial, así que esta página no se puede congelar como estática.
export const dynamic = "force-dynamic";

export default async function NuevaSuite() {
  const svgsDisponibles = await listarSvgsConContenido();

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
      <SuiteWizard svgsDisponibles={svgsDisponibles} />
    </div>
  );
}
