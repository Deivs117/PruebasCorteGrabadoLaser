import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { SuiteWizard } from "@/components/suites/suite-wizard";
import { leerSuiteEditable } from "@/lib/generar-suite";
import { leerCatalogoMateriales } from "@/lib/materiales-catalog";
import { listarSvgsConContenido } from "@/lib/svg-data";

// La galería de SVGs disponibles cambia en cualquier momento desde Grabado
// Vectorial, así que esta página no se puede congelar como estática.
export const dynamic = "force-dynamic";

export default async function NuevaSuite({
  searchParams,
}: PageProps<"/suites/nueva">) {
  const parametros = await searchParams;
  const duplicar = parametros.duplicar;
  const loteParam = parametros.lote;
  const archivoOrigen = typeof duplicar === "string" ? duplicar : undefined;

  const [datosOrigen, svgsDisponibles, catalogoMateriales] =
    await Promise.all([
      archivoOrigen ? leerSuiteEditable(archivoOrigen) : Promise.resolve(null),
      listarSvgsConContenido(),
      leerCatalogoMateriales(),
    ]);
  const materialesDisponibles = catalogoMateriales.map((m) => m.nombre);

  if (archivoOrigen && !datosOrigen) {
    notFound();
  }

  const datosIniciales = datosOrigen
    ? {
        ...datosOrigen,
        lote:
          typeof loteParam === "string" && loteParam.trim()
            ? loteParam.trim()
            : datosOrigen.lote,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/suites" label="Volver a Suites de Prueba" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">
          {archivoOrigen ? "Duplicar suite de prueba" : "Nueva suite de prueba"}
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          {archivoOrigen
            ? "Mismos parámetros que la suite original, con un lote distinto — ajustá lo que necesites y generá su propio G-code."
            : "Configurá el barrido paso a paso y generá su G-code al final."}
        </p>
      </div>
      <SuiteWizard
        datosIniciales={datosIniciales}
        svgsDisponibles={svgsDisponibles}
        materialesDisponibles={materialesDisponibles}
      />
    </div>
  );
}
