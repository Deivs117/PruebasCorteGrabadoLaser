import { NextResponse } from "next/server";
import { guardarFoto } from "@/lib/fotos-data";

export async function POST(request: Request) {
  const formulario = await request.formData().catch(() => null);
  const archivo = formulario?.get("archivo");
  const corridaId = formulario?.get("corridaId");
  const celdaId = formulario?.get("celdaId");

  if (
    !(archivo instanceof File) ||
    typeof corridaId !== "string" ||
    typeof celdaId !== "string" ||
    !corridaId ||
    !celdaId
  ) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos de la foto." },
      { status: 400 },
    );
  }

  const resultado = await guardarFoto(corridaId, celdaId, archivo);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
