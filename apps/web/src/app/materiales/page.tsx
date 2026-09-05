import { Layers } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Materiales() {
  return (
    <PlaceholderPage
      icon={Layers}
      title="Materiales"
      description="Librería de materiales soportados (hoy: MDF) con su ficha técnica — parámetros optomecánicos, comportamiento térmico y qué operaciones ya tienen datos."
      planeado={[
        "Grid de materiales con espesores disponibles",
        "Badge de qué operaciones (corte/grabado) ya tienen suite o ficha",
        "Panel de detalle con la ficha técnica completa del material",
      ]}
    />
  );
}
