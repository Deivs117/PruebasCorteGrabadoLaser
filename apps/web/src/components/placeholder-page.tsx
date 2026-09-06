import type { LucideIcon } from "lucide-react";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Qué va a poder hacer esta sección cuando esté construida. */
  planeado: string[];
  /** Ancla de su sección en /ayuda (ver `AyudaLink`). Si no se pasa, no
   * muestra el enlace — pensado para el caso hipotético de una sección que
   * ni siquiera tiene definido qué va a hacer todavía. */
  ayudaSeccion?: string;
}

/**
 * Página de una sección que todavía no se construyó en esta iteración
 * (alcance actual: Dashboard + shell). Es honesta sobre su estado — nada de
 * datos de muestra ni controles que simulan funcionar.
 */
export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  planeado,
  ayudaSeccion,
}: PlaceholderPageProps) {
  return (
    <Reveal>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-navy text-2xl font-semibold">{title}</h1>
            <p className="text-text-muted mt-1 max-w-2xl text-sm">
              {description}
            </p>
            {ayudaSeccion ? <AyudaLink seccion={ayudaSeccion} /> : null}
          </div>
          <Badge tone="neutral">En construcción</Badge>
        </div>

        <Card accent="blue" className="flex items-start gap-4 p-6">
          <span
            className="bg-blue-soft text-blue flex size-10 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-3">
            <p className="text-navy text-sm font-semibold">
              Esta sección va a permitir:
            </p>
            <ul className="text-text-muted flex flex-col gap-1.5 text-sm">
              {planeado.map((linea) => (
                <li key={linea} className="marker:text-blue list-disc pl-1">
                  {linea}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div>
          <LinkButton href="/" variant="outline">
            Volver a Inicio
          </LinkButton>
        </div>
      </div>
    </Reveal>
  );
}
