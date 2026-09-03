import { FlaskConical } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function SuitesDePrueba() {
  return (
    <PlaceholderPage
      icon={FlaskConical}
      title="Suites de Prueba"
      description="Asistente paso a paso para configurar un barrido de velocidad y potencia (corte o grabado) y generar su G-code, sin escribir configuración a mano."
      planeado={[
        "Elegir operación (corte/grabado), material y espesor",
        "Definir el barrido: lista de velocidades, potencias y número de pasadas",
        "Configurar tamaño de celda y espaciado, con vista previa de la grilla",
        "Generar el G-code y su registro de datos en un solo paso",
      ]}
    />
  );
}
