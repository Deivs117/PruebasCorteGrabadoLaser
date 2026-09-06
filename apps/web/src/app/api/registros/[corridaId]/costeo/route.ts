import { NextResponse } from "next/server";
import { calcularCosteo } from "@/lib/costeo-data";

interface Contexto {
  params: Promise<{ corridaId: string }>;
}

export async function POST(_request: Request, { params }: Contexto) {
  const { corridaId } = await params;
  const resultado = await calcularCosteo(decodeURIComponent(corridaId));
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
