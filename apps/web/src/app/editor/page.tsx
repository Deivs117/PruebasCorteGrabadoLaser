import { AyudaLink } from "@/components/ui/ayuda-link";
import { EditorLienzo } from "@/components/editor/editor-lienzo";
import { leerMaquina } from "@/lib/maquina-data";

// El área de trabajo real se edita desde "Máquina" en cualquier momento, así
// que esta página no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function EditorDeDiseno() {
  const maquina = await leerMaquina();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Editor de Diseño</h1>
        <p className="text-text-muted mt-1 text-sm">
          Subí SVGs e imágenes, posicionalos sobre el área de trabajo real de la
          máquina y generá el toolpath de cada uno. El export combinado a un
          solo G-code todavía no está disponible (ver nota en el lienzo).
        </p>
        <AyudaLink seccion="editor" />
      </div>
      <EditorLienzo
        areaTrabajoAnchoMm={Number(maquina.areaTrabajoAnchoMm)}
        areaTrabajoAltoMm={Number(maquina.areaTrabajoAltoMm)}
      />
    </div>
  );
}
