import { NextResponse } from "next/server";
import { eliminarGrupoCalibracion } from "@/lib/final-run-data";

interface Contexto {
  params: Promise<{ grupoId: string }>;
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { grupoId } = await params;
  const eliminado = await eliminarGrupoCalibracion(decodeURIComponent(grupoId));
  if (!eliminado) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar el grupo de calibración." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
