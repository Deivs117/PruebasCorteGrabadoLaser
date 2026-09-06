import { NextResponse } from "next/server";
import { actualizarSuitePorId, eliminarSuitePorId } from "@/lib/generar-suite";
import { suiteSchema } from "@/lib/suite-schema";

interface Contexto {
  params: Promise<{ id: string }>;
}

function idValido(id: string): number | null {
  const numero = Number(id);
  return Number.isInteger(numero) ? numero : null;
}

export async function PUT(request: Request, { params }: Contexto) {
  const { id: idParam } = await params;
  const id = idValido(idParam);
  if (id === null) {
    return NextResponse.json(
      { ok: false, error: "Id de suite inválido." },
      { status: 400 },
    );
  }

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

  const resultado = await actualizarSuitePorId(id, analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id: idParam } = await params;
  const id = idValido(idParam);
  if (id === null) {
    return NextResponse.json(
      { ok: false, error: "Id de suite inválido." },
      { status: 400 },
    );
  }

  const eliminado = await eliminarSuitePorId(id);
  if (!eliminado) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar la suite." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
