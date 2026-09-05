import Link from "next/link";
import { ArrowLeftAnimado } from "@/components/ui/icons/arrow-left-animado";

interface BackLinkProps {
  href: string;
  label: string;
}

/** Camino de vuelta explícito en una pantalla de flujo largo (asistente,
 * editor) — no depender de que el operario recuerde que existe el sidebar. */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="group text-text-muted hover:text-navy inline-flex w-fit items-center gap-1.5 text-sm transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
    >
      <ArrowLeftAnimado className="size-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
