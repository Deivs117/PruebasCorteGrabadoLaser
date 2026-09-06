import { NextResponse } from "next/server";
import { crearEjecucion } from "@/lib/final-run-data";
import { finalRunSchema } from "@/lib/final-run-schema";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = finalRunSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await crearEjecucion(analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
