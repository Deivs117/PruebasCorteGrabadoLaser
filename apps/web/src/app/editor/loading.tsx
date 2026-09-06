import { AyudaLink } from "@/components/ui/ayuda-link";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `leerMaquina()` (el área de trabajo real que necesita el lienzo). El
 * encabezado es estático; el lienzo en sí se marca como un bloque
 * proporcional al área de trabajo típica (5:3), ya que el tamaño real recién
 * se sabe cuando resuelve el fetch.
 */
export default function CargandoEditorDeDiseno() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Editor de Diseño</h1>
        <p className="text-text-muted mt-1 text-sm">
          Subí SVGs e imágenes, posicionalos sobre el área de trabajo real de la
          máquina y generá el toolpath de cada uno.
        </p>
        <AyudaLink seccion="editor" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Skeleton className="aspect-[5/3] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
