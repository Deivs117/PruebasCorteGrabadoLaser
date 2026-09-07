import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { EliminarProyectoButton } from "@/components/proyectos/eliminar-proyecto-button";
import { listarProyectos } from "@/lib/proyectos-data";
import { tiempoRelativo } from "@/lib/tiempo-relativo";

// Nuevos proyectos se guardan en cualquier momento desde el Editor, así que
// esta lista no se puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function MisProyectos() {
  const proyectos = await listarProyectos();

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

      {proyectos.length === 0 ? (
        <Reveal>
          <EmptyState
            icon={FolderOpen}
            title="Todavía no guardaste ningún proyecto"
            description="Armá un diseño en el Editor y presioná 'Guardar como proyecto' para poder reabrirlo más adelante."
            action={
              <LinkButton href="/editor" variant="primary">
                Ir al Editor
              </LinkButton>
            }
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((proyecto, indice) => (
            <Reveal key={proyecto.id} delayMs={indice * 40}>
              <Card data-eliminable className="flex flex-col gap-3 p-5">
                <Link
                  href={`/editor?proyectoId=${proyecto.id}`}
                  className="text-navy text-base font-semibold hover:underline"
                >
                  {proyecto.nombre}
                </Link>
                <p className="text-text-muted text-sm">
                  {proyecto.cantidadObjetos}{" "}
                  {proyecto.cantidadObjetos === 1 ? "objeto" : "objetos"}
                  {proyecto.material ? ` · ${proyecto.material}` : ""}
                </p>
                <div className="border-border flex items-center justify-between gap-2 border-t pt-3">
                  <p className="text-text-muted text-xs">
                    Guardado {tiempoRelativo(proyecto.updatedAt)}
                  </p>
                  <EliminarProyectoButton
                    id={proyecto.id}
                    nombre={proyecto.nombre}
                  />
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
