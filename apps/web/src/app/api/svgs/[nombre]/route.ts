import { NextResponse } from "next/server";
import { eliminarSvg } from "@/lib/svg-data";

interface Contexto {
  params: Promise<{ nombre: string }>;
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { nombre } = await params;
  const eliminado = await eliminarSvg(decodeURIComponent(nombre));
  if (!eliminado) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar el SVG." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
