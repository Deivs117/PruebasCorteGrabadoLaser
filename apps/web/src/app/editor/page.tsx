import { notFound } from "next/navigation";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { LinkButton } from "@/components/ui/button";
import { EditorLienzo } from "@/components/editor/editor-lienzo";
import { leerMaquina } from "@/lib/maquina-data";
import { obtenerProyecto } from "@/lib/proyectos-data";

// El área de trabajo real se edita desde "Máquina" en cualquier momento, y
// un proyecto guardado (#18) se puede abrir en cualquier momento vía
// ?proyectoId=, así que esta página no se puede congelar como estática.
export const dynamic = "force-dynamic";

export default async function EditorDeDiseno({
  searchParams,
}: PageProps<"/editor">) {
  const parametros = await searchParams;
  const proyectoIdParam = parametros.proyectoId;
  const proyectoId =
    typeof proyectoIdParam === "string" &&
    Number.isInteger(Number(proyectoIdParam))
      ? Number(proyectoIdParam)
      : undefined;

  const [maquina, proyecto] = await Promise.all([
    leerMaquina(),
    proyectoId !== undefined
      ? obtenerProyecto(proyectoId)
      : Promise.resolve(null),
  ]);

  if (proyectoId !== undefined && !proyecto) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">
            {proyecto ? proyecto.nombre : "Editor de Diseño"}
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Subí SVGs e imágenes, posicionalos sobre el área de trabajo real de
            la máquina y generá el toolpath de cada uno. Guardá el diseño como
            proyecto para reabrirlo más adelante sin resubir nada.
          </p>
          <AyudaLink seccion="editor" />
        </div>
        <LinkButton href="/editor/proyectos" variant="outline">
          Mis proyectos
        </LinkButton>
      </div>
      <EditorLienzo
        areaTrabajoAnchoMm={Number(maquina.areaTrabajoAnchoMm)}
        areaTrabajoAltoMm={Number(maquina.areaTrabajoAltoMm)}
        proyectoInicial={
          proyecto
            ? {
                id: proyecto.id,
                nombre: proyecto.nombre,
                objetos: proyecto.objetos,
              }
            : null
        }
      />
    </div>
  );
}
