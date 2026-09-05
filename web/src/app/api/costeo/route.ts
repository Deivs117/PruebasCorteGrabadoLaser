import { NextResponse } from "next/server";
import { calcularCosteo } from "@/lib/costeo-data";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const archivo =
    cuerpo && typeof cuerpo === "object" && "archivo" in cuerpo
      ? String((cuerpo as { archivo: unknown }).archivo)
      : null;

  if (!archivo) {
    return NextResponse.json(
      { ok: false, error: "Falta el archivo." },
      { status: 400 },
    );
  }

  const resultado = await calcularCosteo(archivo);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
