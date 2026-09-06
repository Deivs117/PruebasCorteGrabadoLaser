import { AyudaLink } from "@/components/ui/ayuda-link";
import { SkeletonThumb } from "@/components/ui/skeleton";
import { UploadCloudAnimado } from "@/components/ui/icons/upload-cloud-animado";

/**
 * Se muestra al instante en la navegación mientras `page.tsx` resuelve
 * `listarSvgsConContenido()`. El encabezado y la zona de arrastrar-y-soltar
 * son estáticos (no dependen del fetch); la galería de SVGs ya subidos se
 * marca como skeleton.
 */
export default function CargandoGrabadoVectorialSVG() {
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
        <AyudaLink seccion="grabado-svg" />
      </div>

      <div className="border-border flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-14 text-center">
        <UploadCloudAnimado className="text-navy size-8" strokeWidth={1.5} />
        <p className="text-navy text-sm font-medium">
          Arrastrá un SVG acá, o hacé click para elegirlo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonThumb key={i} />
        ))}
      </div>
    </div>
  );
}
