import { Settings2 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Maquina() {
  return (
    <PlaceholderPage
      icon={Settings2}
      title="Máquina"
      description="Parámetros del perfil de máquina (CNC 3018 + Laser Tree LT-80W-F45): límite de láser, velocidad de desplazamiento, potencia del módulo y factor de utilización."
      planeado={[
        "Formulario con la descripción técnica de cada parámetro",
        "Selector de perfil de máquina, por si se suma una segunda CNC",
        "Conexión directa a LaserGRBL (marcada como próximamente)",
      ]}
    />
  );
}
