import { notFound } from "next/navigation";
import { RegistroEditor } from "@/components/registro/registro-editor";
import { leerRegistro } from "@/lib/registro-data";

export const dynamic = "force-dynamic";

export default async function DetalleRegistro({
  params,
}: PageProps<"/registro/[archivo]">) {
  const { archivo: archivoParam } = await params;
  const archivo = decodeURIComponent(archivoParam);
  const filas = await leerRegistro(archivo);
  const primera = filas?.[0];

  if (!filas || !primera) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-navy text-2xl font-semibold">Hoja de Registro</h1>
        <p className="text-text-muted mt-1 text-sm capitalize">
          {primera.material} · {primera.espesor_mm}mm · {primera.operacion} ·
          lote {primera.lote}
        </p>
      </div>
      <RegistroEditor archivo={archivo} filasIniciales={filas} />
    </div>
  );
}
