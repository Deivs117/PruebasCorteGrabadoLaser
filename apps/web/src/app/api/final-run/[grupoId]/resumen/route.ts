import { NextResponse } from "next/server";
import { MINIMO_EJECUCIONES } from "@/lib/final-run-schema";
import { resumirCalibracion } from "@/lib/final-run-data";

interface Contexto {
  params: Promise<{ grupoId: string }>;
}

export async function POST(_request: Request, { params }: Contexto) {
  const { grupoId } = await params;
  const resultado = await resumirCalibracion(
    decodeURIComponent(grupoId),
    MINIMO_EJECUCIONES,
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
