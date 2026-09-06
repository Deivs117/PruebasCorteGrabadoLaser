import Link from "next/link";
import { HelpCircleAnimado } from "@/components/ui/icons/help-circle-animado";

interface AyudaLinkProps {
  /** Ancla de la sección correspondiente en /ayuda (ver `id` de cada
   * <section> en app/ayuda/page.tsx) — normalmente el mismo slug de la ruta,
   * sin la barra inicial (ej. "costeo", "final-run"). */
  seccion: string;
  className?: string;
}

/**
 * Enlace de contexto atómico: desde cualquier pantalla, un camino directo a
 * SU sección de ayuda (no al tope de /ayuda) — para que la respuesta esté a
 * un click, no perdida en un documento aparte.
 */
export function AyudaLink({ seccion, className }: AyudaLinkProps) {
  return (
    <Link
      href={`/ayuda#${seccion}`}
      className={
        "group text-text-muted hover:text-blue mt-2 inline-flex w-fit items-center gap-1.5 text-sm transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]" +
        (className ? ` ${className}` : "")
      }
    >
      <HelpCircleAnimado className="size-4" strokeWidth={1.75} />
      ¿Dudas? Ver ayuda de esta sección
    </Link>
  );
}
