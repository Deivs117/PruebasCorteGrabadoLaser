import { NextResponse } from "next/server";
import { guardarMaquina } from "@/lib/maquina-data";
import { maquinaSchema } from "@/lib/maquina-schema";

export async function PUT(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = maquinaSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  await guardarMaquina(analisis.data);
  return NextResponse.json({ ok: true });
}
