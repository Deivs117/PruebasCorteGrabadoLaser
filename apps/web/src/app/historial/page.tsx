import { History } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { HistorialListado } from "@/components/historial/historial-listado";
import { colorDeMaterial } from "@/lib/material-color";
import { leerCatalogoMateriales } from "@/lib/materiales-catalog";
import { listarHistorial } from "@/lib/historial-data";

// Se completan/costean corridas en cualquier momento desde otras secciones,
// así que esta lista no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function Historial() {
  const [corridas, catalogo] = await Promise.all([
    listarHistorial(),
    leerCatalogoMateriales(),
  ]);

  const familiaPorMaterial = new Map(
    catalogo.map((m) => [m.nombre.toLowerCase(), m.familia]),
  );
  const conMaterial = corridas.map((corrida) => ({
    ...corrida,
    familia: familiaPorMaterial.get(corrida.material.toLowerCase()) ?? "otro",
    color: colorDeMaterial(corrida.material),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Historial</h1>
        <p className="text-text-muted mt-1 text-sm">
          Resumen de todas las corridas hechas en el taller, de solo lectura —
          para completar o costear una corrida, andá a Hoja de Registro.
        </p>
        <AyudaLink seccion="historial" />
      </div>

      {corridas.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={History}
            title="Todavía no hay ninguna corrida en el historial"
            description="Apenas se genere y corra una suite de prueba, va a aparecer acá."
            action={
              <LinkButton href="/suites" variant="primary">
                Ir a Suites de Prueba
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <HistorialListado corridas={conMaterial} />
      )}
    </div>
  );
}
