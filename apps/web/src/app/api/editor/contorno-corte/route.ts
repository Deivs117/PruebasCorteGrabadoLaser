import { NextResponse } from "next/server";
import { generarContornoCorte } from "@/lib/editor-contorno-data";
import { contornoCorteSchema } from "@/lib/editor-contorno-schema";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = contornoCorteSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await generarContornoCorte(analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
