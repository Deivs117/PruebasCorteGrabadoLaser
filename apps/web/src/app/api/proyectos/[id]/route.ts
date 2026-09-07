import { NextResponse } from "next/server";
import {
  actualizarProyecto,
  eliminarProyectoPorId,
} from "@/lib/proyectos-data";
import { guardarProyectoSchema } from "@/lib/proyecto-schema";

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
      { ok: false, error: "Id de proyecto inválido." },
      { status: 400 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = guardarProyectoSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await actualizarProyecto(id, analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id: idParam } = await params;
  const id = idValido(idParam);
  if (id === null) {
    return NextResponse.json(
      { ok: false, error: "Id de proyecto inválido." },
      { status: 400 },
    );
  }

  const eliminado = await eliminarProyectoPorId(id);
  if (!eliminado) {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar el proyecto." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
