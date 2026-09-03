import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { SuiteWizard } from "@/components/suites/suite-wizard";
import { leerSuiteEditable } from "@/lib/generar-suite";

export const dynamic = "force-dynamic";

export default async function EditarSuite({
  params,
}: PageProps<"/suites/[archivo]/editar">) {
  const { archivo: archivoParam } = await params;
  const archivo = decodeURIComponent(archivoParam);
  const datos = await leerSuiteEditable(archivo);

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
          la versión actualizada.
        </p>
      </div>
      <SuiteWizard archivoExistente={archivo} datosIniciales={datos} />
    </div>
  );
}
