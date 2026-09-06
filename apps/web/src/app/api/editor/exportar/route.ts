import { NextResponse } from "next/server";
import { exportarGcodeCombinado } from "@/lib/editor-data";
import { exportarGcodeSchema } from "@/lib/editor-export-schema";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = exportarGcodeSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await exportarGcodeCombinado(analisis.data.objetos);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
