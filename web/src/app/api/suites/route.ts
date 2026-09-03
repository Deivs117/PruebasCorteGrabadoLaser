import { NextResponse } from "next/server";
import { generarSuite } from "@/lib/generar-suite";
import { suiteSchema } from "@/lib/suite-schema";

export async function POST(request: Request) {
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

  const resultado = await generarSuite(analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
