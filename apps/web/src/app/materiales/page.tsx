import { AyudaLink } from "@/components/ui/ayuda-link";
import { MaterialesGrid } from "@/components/materiales/materiales-grid";
import { listarMaterialesConDatos } from "@/lib/materiales-catalog";

// El catálogo y las suites cambian en cualquier momento desde otras
// secciones, así que esta página no se puede congelar como estática.
export const dynamic = "force-dynamic";

export default async function Materiales() {
  const materiales = await listarMaterialesConDatos();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Materiales</h1>
        <p className="text-text-muted mt-1 text-sm">
          Espesores y operaciones se derivan automáticamente de las suites ya
          corridas — nunca se cargan a mano.
        </p>
        <AyudaLink seccion="materiales" />
      </div>
      <MaterialesGrid materiales={materiales} />
    </div>
  );
}
