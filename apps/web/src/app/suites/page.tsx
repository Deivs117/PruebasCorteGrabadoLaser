import { FlaskConical } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SuitesListado } from "@/components/suites/suites-listado";
import { listarSuites } from "@/lib/fs-data";
import { colorDeMaterial } from "@/lib/material-color";
import { leerCatalogoMateriales } from "@/lib/materiales-catalog";

// Nuevas suites se agregan en cualquier momento (desde el asistente o a
// mano), así que esta lista no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function SuitesDePrueba() {
  const [suites, catalogo] = await Promise.all([
    listarSuites(),
    leerCatalogoMateriales(),
  ]);
  const familiaPorMaterial = new Map(
    catalogo.map((m) => [m.nombre.toLowerCase(), m.familia]),
  );
  const suitesConMaterial = suites.map((suite) => ({
    ...suite,
    familia: familiaPorMaterial.get(suite.material.toLowerCase()) ?? "otro",
    color: colorDeMaterial(suite.material),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Suites de Prueba</h1>
          <p className="text-text-muted mt-1 text-sm">
            Cada suite es un barrido de velocidad y potencia listo para correr
            en la máquina.
          </p>
          <AyudaLink seccion="suites" />
        </div>
        <LinkButton href="/suites/nueva" variant="primary">
          Nueva suite de prueba
        </LinkButton>
      </div>

      {suites.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={FlaskConical}
            title="Todavía no hay ninguna suite configurada"
            description="Presioná para agregar y configurar una prueba: elegís el material, el barrido de velocidad y potencia, y se genera el G-code al final."
            action={
              <LinkButton href="/suites/nueva" variant="primary">
                Configurar una suite de prueba
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <SuitesListado suites={suitesConMaterial} />
      )}
    </div>
  );
}
