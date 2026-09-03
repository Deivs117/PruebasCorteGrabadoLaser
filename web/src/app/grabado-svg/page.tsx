import { Shapes } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function GrabadoVectorialSVG() {
  return (
    <PlaceholderPage
      icon={Shapes}
      title="Grabado Vectorial (SVG)"
      description="Importar un SVG (por ejemplo, el logo de la empresa) y convertirlo a G-code de contorno y/o relleno."
      planeado={[
        "Subir un SVG y ver su geometría junto al toolpath resultante",
        "Elegir modo de grabado: contorno, relleno, o ambos",
        "Ajustar ancho/alto en mm, velocidad, potencia y resolución de relleno",
        "Mostrar con claridad los casos no soportados (arcos SVG, transform)",
      ]}
    />
  );
}
