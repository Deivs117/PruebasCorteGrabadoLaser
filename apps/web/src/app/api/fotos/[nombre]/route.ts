import { NextResponse } from "next/server";
import { eliminarFoto, leerFoto } from "@/lib/fotos-data";

interface Contexto {
  params: Promise<{ nombre: string }>;
}

export async function GET(_request: Request, { params }: Contexto) {
  const { nombre } = await params;
  const foto = await leerFoto(decodeURIComponent(nombre));
  if (!foto) {
    return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(foto.bytes), {
    headers: {
      "Content-Type": foto.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { nombre } = await params;
  const eliminada = await eliminarFoto(decodeURIComponent(nombre));
  if (!eliminada) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar la foto." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
