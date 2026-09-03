import { NextResponse } from "next/server";
import { marcarCandidato } from "@/lib/candidatos-final-run";
import { marcarCandidatoSchema } from "@/lib/candidato-schema";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = marcarCandidatoSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      { ok: false, error: analisis.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  }

  const candidato = await marcarCandidato(analisis.data);
  return NextResponse.json({ ok: true, candidato });
}
