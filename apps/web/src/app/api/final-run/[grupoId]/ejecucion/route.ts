import { NextResponse } from "next/server";
import { generarSiguienteEjecucion } from "@/lib/final-run-data";

interface Contexto {
  params: Promise<{ grupoId: string }>;
}

export async function POST(_request: Request, { params }: Contexto) {
  const { grupoId } = await params;
  const resultado = await generarSiguienteEjecucion(
    decodeURIComponent(grupoId),
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
