import { BarChart3 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Reportes() {
  return (
    <PlaceholderPage
      ayudaSeccion="reportes"
      icon={BarChart3}
      title="Reportes"
      description="Vista agregada de costos y calibración a través del tiempo, una vez que existan suficientes corridas registradas y costeadas para que un reporte diga algo real."
      planeado={[
        "Costo promedio por material y operación",
        "Evolución del kWh por unidad calibrado en el tiempo",
        "Tabla resumen exportable con el ahorro estimado tras calibrar",
      ]}
    />
  );
}
