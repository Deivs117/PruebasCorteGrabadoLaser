import { NextResponse } from "next/server";
import { convertirSvg } from "@/lib/svg-data";
import { conversionSvgSchema } from "@/lib/svg-schema";

interface Contexto {
  params: Promise<{ nombre: string }>;
}

export async function POST(request: Request, { params }: Contexto) {
  const { nombre } = await params;
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = conversionSvgSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await convertirSvg(
    decodeURIComponent(nombre),
    analisis.data,
  );
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
