import { BackLink } from "@/components/ui/back-link";
import { NuevaFichaForm } from "@/components/fichas/nueva-ficha-form";
import { listarGruposCalibracion } from "@/lib/final-run-data";

export const dynamic = "force-dynamic";

export default async function NuevaFicha() {
  const grupos = await listarGruposCalibracion();
  const gruposSinFicha = grupos.filter((g) => g.fichaEstado === null);

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
      <NuevaFichaForm grupos={gruposSinFicha} />
    </div>
  );
}
