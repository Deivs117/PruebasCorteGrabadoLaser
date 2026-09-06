import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { SuiteWizard } from "@/components/suites/suite-wizard";
import { leerSuiteParaFormulario } from "@/lib/generar-suite";
import { leerCatalogoMateriales } from "@/lib/materiales-catalog";
import { listarSvgsConContenido } from "@/lib/svg-data";

// Idem Hoja de Registro/Costeo: los datos de la suite cambian en cualquier
// momento desde otras secciones (o desde otra pestaña), así que no se
// puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function EditarSuite({
  params,
}: PageProps<"/suites/[id]/editar">) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const [datos, svgsDisponibles, catalogoMateriales] = await Promise.all([
    leerSuiteParaFormulario(id),
    listarSvgsConContenido(),
    leerCatalogoMateriales(),
  ]);
  const materialesDisponibles = catalogoMateriales.map((m) => m.nombre);

  if (!datos) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/suites" label="Volver a Suites de Prueba" />
      <div>
        <h1 className="text-navy text-2xl font-semibold">Editar suite</h1>
        <p className="text-text-muted mt-1 text-sm">
          Los cambios regeneran el G-code de esta suite — la máquina va a correr
          la versión actualizada. Si esta suite ya tiene evaluación, medición o
          costeo cargado en su Hoja de Registro, guardar va a fallar (usá
          &quot;Duplicar&quot; con otro lote en cambio).
        </p>
      </div>
      <SuiteWizard
        suiteIdExistente={id}
        datosIniciales={datos}
        svgsDisponibles={svgsDisponibles}
        materialesDisponibles={materialesDisponibles}
      />
    </div>
  );
}
