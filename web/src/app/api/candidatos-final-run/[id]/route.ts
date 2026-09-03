import { NextResponse } from "next/server";
import { desmarcarCandidato } from "@/lib/candidatos-final-run";

interface Contexto {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params;
  await desmarcarCandidato(decodeURIComponent(id));
  return NextResponse.json({ ok: true });
}
