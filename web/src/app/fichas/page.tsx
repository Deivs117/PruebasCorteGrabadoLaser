import { FileBadge } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function FichasDeParametro() {
  return (
    <PlaceholderPage
      icon={FileBadge}
      title="Fichas de Parámetro Estándar"
      description="Las 'recetas' oficiales por material, espesor y operación, respaldadas por un Final Run calibrado — hoy todavía no hay ninguna publicada."
      planeado={[
        "Grid de fichas por material, espesor y operación",
        "Parámetros oficiales, origen (grupo de calibración) y costo estándar",
        "Editor con vista previa del documento y exportación a PDF",
      ]}
    />
  );
}
