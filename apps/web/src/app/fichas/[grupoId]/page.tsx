import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { FichaDetalle } from "@/components/fichas/ficha-detalle";
import { listarFichas } from "@/lib/fichas-data";

export const dynamic = "force-dynamic";

export default async function DetalleFicha({
  params,
}: PageProps<"/fichas/[grupoId]">) {
  const { grupoId: grupoIdParam } = await params;
  const grupoId = decodeURIComponent(grupoIdParam);

  const fichas = await listarFichas();
  const ficha = fichas.find((f) => f.grupoId === grupoId);

  if (!ficha) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/fichas" label="Volver a Fichas de Parámetro" />
      <div className="print:hidden">
        <h1 className="text-navy text-2xl font-semibold">{ficha.material}</h1>
        <p className="text-text-muted mt-1 text-sm capitalize">
          {ficha.operacion} · {ficha.espesorMm}mm
        </p>
      </div>
      <FichaDetalle inicial={ficha} />
    </div>
  );
}
