import { BackLink } from "@/components/ui/back-link";
import { LinkButton } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarProyectos()` -- mismo criterio que `suites/loading.tsx`.
 */
export default function CargandoMisProyectos() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackLink href="/editor" label="Volver al Editor" />
          <h1 className="text-navy mt-2 text-2xl font-semibold">
            Mis proyectos
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Diseños guardados del Editor -- reabrí uno para volver a posicionar
            y exportar el mismo logo o pieza sin resubir nada.
          </p>
        </div>
        <LinkButton href="/editor" variant="primary">
          Ir al Editor
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
