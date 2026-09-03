import { CircleDollarSign } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Tarifas() {
  return (
    <PlaceholderPage
      icon={CircleDollarSign}
      title="Tarifas"
      description="El único lugar con valores monetarios: tarifa eléctrica, tarifa hora-máquina y precio de material. Lo completa el área financiera; es información sensible que no se comparte con el resto del equipo."
      planeado={[
        "Formulario de moneda, tarifa eléctrica y tarifa hora-máquina",
        "Tabla de precio de material por m², indexada por espesor",
        "Historial de cambios de tarifas a lo largo del tiempo",
      ]}
    />
  );
}
