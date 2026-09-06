import { NextResponse } from "next/server";
import { actualizarFichaGrupo } from "@/lib/final-run-data";
import { fichaSchema } from "@/lib/ficha-schema";

interface Contexto {
  params: Promise<{ grupoId: string }>;
}

export async function POST(request: Request, { params }: Contexto) {
  const { grupoId } = await params;
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = fichaSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await actualizarFichaGrupo(
    decodeURIComponent(grupoId),
    analisis.data,
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
