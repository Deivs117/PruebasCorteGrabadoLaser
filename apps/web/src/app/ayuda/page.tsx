import { HelpCircle } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Ayuda() {
  return (
    <PlaceholderPage
      icon={HelpCircle}
      title="Ayuda"
      description="Mientras esta sección no esté construida, el protocolo de una página para correr una prueba en el taller se consulta aparte, en el documento impreso del taller."
      planeado={[
        "SOP de corrida de prueba integrado como contenido navegable",
        "Glosario de términos (barrido, Final Run, Ficha de Parámetro)",
        "Enlaces de contexto desde cada pantalla hacia su sección de ayuda",
      ]}
    />
  );
}
