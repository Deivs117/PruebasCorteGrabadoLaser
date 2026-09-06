import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarFichas()`. El título real depende del material de la ficha, así
 * que ni siquiera eso puede repetirse estático acá.
 */
export default function CargandoDetalleFicha() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/fichas" label="Volver a Fichas de Parámetro" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Card className="flex max-w-xl flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    </div>
  );
}
