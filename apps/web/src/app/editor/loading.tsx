import { Skeleton } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `leerMaquina()` (el área de trabajo real que necesita el lienzo). Issue
 * #178: `/editor` es un workspace inmersivo (`h-screen`, sin sidebar/topbar
 * globales -- ver `esRutaInmersiva` en `app-shell.tsx`), así que este
 * esqueleto tiene que calzar esa misma forma para no saltar de tamaño
 * cuando `page.tsx` termine de resolver.
 */
export default function CargandoEditorDeDiseno() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="border-border flex w-16 shrink-0 flex-col items-center gap-2 border-r py-3">
          <Skeleton className="size-12" />
          <Skeleton className="size-12" />
        </div>
        <Skeleton className="m-3 flex-1" />
      </div>
    </div>
  );
}
