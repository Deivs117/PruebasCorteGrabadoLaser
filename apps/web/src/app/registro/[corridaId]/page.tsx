import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { RegistroEditor } from "@/components/registro/registro-editor";
import { leerRegistro } from "@/lib/registro-data";
import { listarCandidatos } from "@/lib/candidatos-final-run";

export const dynamic = "force-dynamic";

export default async function DetalleRegistro({
  params,
}: PageProps<"/registro/[corridaId]">) {
  const { corridaId: corridaIdParam } = await params;
  const corridaId = decodeURIComponent(corridaIdParam);
  const [detalle, candidatos] = await Promise.all([
    leerRegistro(corridaId),
    listarCandidatos(),
  ]);

  if (!detalle) {
    notFound();
  }

  const candidatosIniciales = candidatos
    .filter((c) => c.corridaId === corridaId)
    .map((c) => c.id);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/registro" label="Volver a Hoja de Registro" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
          <p className="text-text-muted mt-1 text-sm capitalize">
            {detalle.material} · {detalle.espesorMm}mm · {detalle.operacion} ·
            lote {detalle.lote}
          </p>
        </div>
        {/* Calificando esta corrida (kWh/tiempo real/carbonización por
            celda) es justo cuando más falta hace poder volver a bajar el
            G-code -- antes solo existía en el banner efímero de justo
            después de generarla (#129). */}
        <DescargarBoton
          archivo={`${detalle.corridaId}.gcode`}
          etiqueta="Descargar G-code"
          endpointBase="/api/descargas/gcode"
        />
      </div>
      <RegistroEditor
        detalle={detalle}
        candidatosIniciales={candidatosIniciales}
      />
    </div>
  );
}
