import type { HTMLAttributes } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/card";

/**
 * Bloque base de los estados de carga (`loading.tsx` de las páginas
 * dinámicas, ver #76). Nunca reemplaza el layout por un spinner genérico:
 * cada uso de `Skeleton` calca el tamaño real de lo que va a aparecer ahí,
 * para que el salto al contenido real se sienta continuo. El shimmer es la
 * clase `skeleton-pulso` de globals.css.
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "skeleton-pulso bg-navy-soft rounded-[var(--radius-sm)]",
        className,
      )}
      {...props}
    />
  );
}

/** Placeholder de una fila de tabla (ver la tabla de `RegistroEditor`): una
 * celda por columna, cada una un bloque — el ancho real de cada columna se
 * define en el `loading.tsx` que la usa, esto solo reparte columnas iguales. */
export function SkeletonTableRow({ columnas }: { columnas: number }) {
  return (
    <tr>
      {Array.from({ length: columnas }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-28" />
        </td>
      ))}
    </tr>
  );
}

/** Placeholder de una `Card` de listado tipo "corrida/suite": ícono +
 * título, una barra de progreso, y una acción al pie — el patrón que se
 * repite en `RegistroListado` y en las grillas de Suites/Final Run/Costeo/
 * Historial. */
export function SkeletonCard() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="border-border flex items-center justify-between border-t pt-3">
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  );
}

/** Placeholder de una `StatTile` del dashboard: label + cifra grande +
 * texto de ayuda. */
export function SkeletonStatTile() {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-36" />
    </Card>
  );
}

/** Placeholder de un `Field` de formulario (ver `components/ui/field.tsx`):
 * label + control — para los formularios largos (Tarifas, SuiteWizard,
 * FinalRunForm) que hoy no tienen forma de tabla/tarjeta para reutilizar. */
export function SkeletonField() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/** Placeholder de una miniatura cuadrada (ver `SvgGaleria`): imagen + pie de
 * nombre de archivo. */
export function SkeletonThumb() {
  return (
    <Card className="flex flex-col gap-2 p-2">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-3 w-3/4" />
    </Card>
  );
}
