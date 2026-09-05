import { SvgDropzone } from "@/components/grabado-svg/svg-dropzone";
import { SvgGaleria } from "@/components/grabado-svg/svg-galeria";
import { SvgWorkspace } from "@/components/grabado-svg/svg-workspace";
import { listarSvgsConContenido } from "@/lib/svg-data";

// Se suben y eliminan SVGs en cualquier momento, así que esta página no se
// puede congelar como estática en el build.
export const dynamic = "force-dynamic";

export default async function GrabadoVectorialSVG({
  searchParams,
}: PageProps<"/grabado-svg">) {
  const { svg } = await searchParams;
  const nombreSeleccionado = typeof svg === "string" ? svg : undefined;

  const galeria = await listarSvgsConContenido();
  const contenidoSeleccionado = galeria.find(
    (item) => item.nombre === nombreSeleccionado,
  )?.contenido;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">
          Grabado Vectorial (SVG)
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          Convertí un diseño SVG a G-code de contorno y/o relleno, viendo el
          toolpath real antes de correrlo en la máquina.
        </p>
      </div>

      {nombreSeleccionado && contenidoSeleccionado ? (
        <SvgWorkspace
          nombre={nombreSeleccionado}
          contenidoSvg={contenidoSeleccionado}
        />
      ) : (
        <SvgDropzone />
      )}

      <SvgGaleria items={galeria} seleccionado={nombreSeleccionado} />
    </div>
  );
}
