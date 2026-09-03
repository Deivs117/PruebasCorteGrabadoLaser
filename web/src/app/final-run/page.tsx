import { Gauge } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function FinalRun() {
  return (
    <PlaceholderPage
      icon={Gauge}
      title="Final Run (Calibración)"
      description="Seguimiento de los grupos de calibración: una combinación fija de parámetros repetida en ejecuciones independientes, hasta reunir el mínimo de 3 necesario para considerarla calibrada."
      planeado={[
        "Lista de grupos con su progreso (ej. 2/3 ejecuciones)",
        "Detalle por grupo: kWh por unidad y tiempo por unidad entre ejecuciones",
        "Desviación estándar y coeficiente de variación de cada grupo",
      ]}
    />
  );
}
