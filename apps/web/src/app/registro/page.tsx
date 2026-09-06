import { ClipboardList } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { RegistroListado } from "@/components/registro/registro-listado";
import { colorDeMaterial } from "@/lib/material-color";
import { leerCatalogoMateriales } from "@/lib/materiales-catalog";
import { listarRegistros } from "@/lib/registro-data";

// Se completan corridas en cualquier momento desde otras secciones (o a mano
// en la máquina), así que esta lista no se puede congelar como estática en
// el build.
export const dynamic = "force-dynamic";

export default async function HojaDeRegistro() {
  const [registros, catalogo] = await Promise.all([
    listarRegistros(),
    leerCatalogoMateriales(),
  ]);

  const familiaPorMaterial = new Map(
    catalogo.map((m) => [m.nombre.toLowerCase(), m.familia]),
  );
  const conMaterial = registros.map((corrida) => ({
    ...corrida,
    familia: familiaPorMaterial.get(corrida.material.toLowerCase()) ?? "otro",
    color: colorDeMaterial(corrida.material),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
        <p className="text-text-muted mt-1 text-sm">
          Evaluación celda por celda de las corridas que ya se corrieron en la
          máquina.
        </p>
        <AyudaLink seccion="registro" />
      </div>

      {registros.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={ClipboardList}
            title="Todavía no hay ninguna corrida para registrar"
            description="Primero generá una suite de prueba y corré su G-code en la máquina — recién ahí vas a poder completar acá la evaluación de cada celda."
            action={
              <LinkButton href="/suites" variant="primary">
                Ir a Suites de Prueba
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <RegistroListado registros={conMaterial} />
      )}
    </div>
  );
}
