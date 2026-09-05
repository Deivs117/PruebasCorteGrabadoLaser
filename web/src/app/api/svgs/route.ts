import { NextResponse } from "next/server";
import { guardarSvg } from "@/lib/svg-data";

export async function POST(request: Request) {
  const formulario = await request.formData().catch(() => null);
  const archivo = formulario?.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Falta el archivo." },
      { status: 400 },
    );
  }

  const resultado = await guardarSvg(archivo);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
