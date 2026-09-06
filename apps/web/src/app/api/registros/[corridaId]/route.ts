import { NextResponse } from "next/server";
import { eliminarCorrida, guardarRegistro } from "@/lib/registro-data";
import { guardarRegistroSchema } from "@/lib/registro-schema";

interface Contexto {
  params: Promise<{ corridaId: string }>;
}

export async function PUT(request: Request, { params }: Contexto) {
  const { corridaId } = await params;
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = guardarRegistroSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((e) => e.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await guardarRegistro(
    decodeURIComponent(corridaId),
    analisis.data,
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}

/** Borra la corrida completa (y su Suite -- ver `registro-data.ts`), junto
 * con sus fotos y su `.gcode` en Storage. */
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
