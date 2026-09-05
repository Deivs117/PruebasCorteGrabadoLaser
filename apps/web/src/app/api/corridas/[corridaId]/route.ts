import { NextResponse } from "next/server";
import { eliminarCorrida } from "@/lib/registro-data";

interface Contexto {
  params: Promise<{ corridaId: string }>;
}

/** Borra una corrida completa (G-code, csv generado, csv de registro y sus
 * fotos) — es la unidad real que el taller entiende, no un archivo suelto. */
export async function DELETE(_request: Request, { params }: Contexto) {
  const { corridaId } = await params;
  const eliminada = await eliminarCorrida(decodeURIComponent(corridaId));
  if (!eliminada) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar la corrida." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
