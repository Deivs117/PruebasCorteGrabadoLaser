import { NextResponse } from "next/server";
import { generarMarcoCorte } from "@/lib/editor-marco-data";
import { marcoCorteSchema } from "@/lib/editor-marco-schema";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = marcoCorteSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await generarMarcoCorte(analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
