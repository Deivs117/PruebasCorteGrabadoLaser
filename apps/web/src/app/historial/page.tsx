import { History } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function Historial() {
  return (
    <PlaceholderPage
      ayudaSeccion="historial"
      icon={History}
      title="Historial"
      description="Explorador de todas las corridas de prueba hechas en el taller, filtrable por material, fecha, operación y estado (Generada/Registrada/Costeada/Calibrada)."
      planeado={[
        "Panel de filtros por material, rango de fecha, operación y estado",
        "Listado con lote, material y espesor, y evidencia fotográfica",
        "Búsqueda por lote o por identificador de la corrida",
      ]}
    />
  );
}
