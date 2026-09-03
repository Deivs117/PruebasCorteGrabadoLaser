import { NextResponse } from "next/server";
import { eliminarSuite } from "@/lib/fs-data";
import { actualizarSuite } from "@/lib/generar-suite";
import { suiteSchema } from "@/lib/suite-schema";

interface Contexto {
  params: Promise<{ archivo: string }>;
}

export async function PUT(request: Request, { params }: Contexto) {
  const { archivo } = await params;
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = suiteSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await actualizarSuite(
    decodeURIComponent(archivo),
    analisis.data,
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
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
