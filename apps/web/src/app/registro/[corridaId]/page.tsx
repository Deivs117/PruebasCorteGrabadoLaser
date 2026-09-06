import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
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
      <div>
        <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
        <p className="text-text-muted mt-1 text-sm capitalize">
          {detalle.material} · {detalle.espesorMm}mm · {detalle.operacion} ·
          lote {detalle.lote}
        </p>
      </div>
      <RegistroEditor
        detalle={detalle}
        candidatosIniciales={candidatosIniciales}
      />
    </div>
  );
}
