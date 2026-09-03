import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
      className="text-text-muted hover:text-navy inline-flex w-fit items-center gap-1.5 text-sm transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
    >
      <ArrowLeft className="size-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
