import { ClipboardList } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function HojaDeRegistro() {
  return (
    <PlaceholderPage
      icon={ClipboardList}
      title="Hoja de Registro"
      description="Completar a mano, celda por celda, la evaluación de una corrida real: corte pasante, calidad de borde, carbonización, foto y notas — más el kWh y tiempo medidos de la corrida completa."
      planeado={[
        "Tabla editable con una fila por celda de la grilla",
        "Progreso de celdas evaluadas sobre el total",
        "Carga de foto de evidencia por celda",
        "Campos fijos de kWh medido y tiempo real de la corrida",
      ]}
    />
  );
}
