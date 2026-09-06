import { NextResponse } from "next/server";
import { actualizarSuite, eliminarSuitePorId } from "@/lib/generar-suite";
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

/** Pese al nombre del segmento de ruta (`[archivo]`, heredado de cuando las
 * suites vivían como YAML — B/#62 lo va a renombrar), acá siempre llega el
 * `id` numérico real de la fila `Suite` en Supabase. */
export async function DELETE(_request: Request, { params }: Contexto) {
  const { archivo } = await params;
  const id = Number(archivo);
  if (!Number.isInteger(id)) {
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
