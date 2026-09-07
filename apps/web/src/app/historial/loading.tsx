import { AyudaLink } from "@/components/ui/ayuda-link";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarPanoramaFamilias()`. El encabezado es estático; las 4 tarjetas de
 * familia se marcan como skeleton (siempre son 4, así que el número de
 * placeholders no es una adivinanza).
 */
export default function CargandoHistorial() {
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
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
