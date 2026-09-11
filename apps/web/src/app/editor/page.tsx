import { notFound } from "next/navigation";
import { EditorLienzo } from "@/components/editor/editor-lienzo";
import { leerMaquina } from "@/lib/maquina-data";
import { obtenerProyecto } from "@/lib/proyectos-data";
import { listarSvgsConContenido } from "@/lib/svg-data";

// El área de trabajo real se edita desde "Máquina" en cualquier momento, y
// un proyecto guardado (#18) se puede abrir en cualquier momento vía
// ?proyectoId=, así que esta página no se puede congelar como estática.
export const dynamic = "force-dynamic";

// Issue #178: workspace inmersivo -- `EditorLienzo` arma su propio header
// (salir, nombre del proyecto, guardar, modo Producción/Prueba, exportar)
// dentro de un layout `h-screen`, así que esta página no le agrega ningún
// wrapper/título propio (a diferencia del resto de las páginas de la app).
// `AppShell` también oculta el sidebar/topbar globales para esta ruta
// (`esRutaInmersiva` en `app-shell.tsx`) -- entre ambos, `/editor` es la
// única página que ocupa el viewport completo.
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

  const [maquina, proyecto, bibliotecaSvg] = await Promise.all([
    leerMaquina(),
    proyectoId !== undefined
      ? obtenerProyecto(proyectoId)
      : Promise.resolve(null),
    // Issue #183: biblioteca de SVGs ya subidos (mismo storage que
    // "Grabado Vectorial") -- se muestra en el panel "Subir" para poder
    // reusar uno sin volver a subir el archivo.
    listarSvgsConContenido(),
  ]);

  if (proyectoId !== undefined && !proyecto) {
    notFound();
  }

  return (
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
      bibliotecaSvg={bibliotecaSvg}
    />
  );
}
