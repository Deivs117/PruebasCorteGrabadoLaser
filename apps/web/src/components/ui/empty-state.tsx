import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Estado vacío que guía al usuario al siguiente paso concreto — nunca un
 * placeholder mudo. Se usa la primera vez que una sección no tiene datos
 * todavía (regla de negocio: la app debe comunicar qué hacer).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed px-6 py-12 text-center">
      <span
        className="bg-blue-soft text-blue flex size-12 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </span>
      <h3 className="text-navy text-base font-semibold">{title}</h3>
      <p className="text-text-muted max-w-md text-sm">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
