import { AyudaLink } from "@/components/ui/ayuda-link";
import { Reveal } from "@/components/ui/reveal";
import { FamiliaPanel } from "@/components/historial/familia-panel";
import { listarPanoramaFamilias } from "@/lib/historial-data";

// El panorama cambia en cualquier momento (nuevas corridas, evaluaciones,
// costeos desde otras secciones), así que esta página no se puede congelar
// como estática en el build.
export const dynamic = "force-dynamic";

export default async function Historial() {
  const panorama = await listarPanoramaFamilias();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Historial</h1>
        <p className="text-text-muted mt-1 text-sm">
          Panorama de alto nivel por familia de material — cuántas pruebas tiene
          cada una, en qué rango se mueve, cuál es su costo promedio. Para el
          detalle de una corrida puntual, andá a Hoja de Registro o Costeo.
        </p>
        <AyudaLink seccion="historial" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {panorama.map((familia, indice) => (
          <Reveal key={familia.familia} delayMs={indice * 40}>
            <FamiliaPanel panorama={familia} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
