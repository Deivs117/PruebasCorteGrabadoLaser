import { NextResponse } from "next/server";
import { eliminarSuite } from "@/lib/fs-data";

interface Contexto {
  params: Promise<{ archivo: string }>;
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { archivo } = await params;
  const eliminado = await eliminarSuite(decodeURIComponent(archivo));
  if (!eliminado) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar la suite." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
