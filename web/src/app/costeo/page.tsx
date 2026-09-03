import { Calculator } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Costeo() {
  return (
    <PlaceholderPage
      icon={Calculator}
      title="Costeo"
      description="Calcular, para una Hoja de Registro completa y las tarifas del taller, los tres componentes de costo por celda (energía, material, tiempo de máquina) sin inventar ningún valor monetario."
      planeado={[
        "Elegir una corrida ya registrada para calcular sus costos",
        "Tabla de costo por celda, con las tarifas sin definir marcadas como tal",
        "Mapa de calor de velocidad y potencia por costo total",
      ]}
    />
  );
}
