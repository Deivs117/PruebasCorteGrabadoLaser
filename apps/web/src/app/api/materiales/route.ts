import { NextResponse } from "next/server";
import { z } from "zod";
import {
  agregarMaterialCatalogo,
  FAMILIAS_MATERIAL,
  leerCatalogoMateriales,
} from "@/lib/materiales-catalog";

export async function GET() {
  const catalogo = await leerCatalogoMateriales();
  return NextResponse.json({ ok: true, catalogo });
}

const agregarMaterialSchema = z.object({
  nombre: z.string().min(1, "El nombre del material no puede estar vacío."),
  familia: z.enum(FAMILIAS_MATERIAL),
});

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = agregarMaterialSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await agregarMaterialCatalogo(
    analisis.data.nombre,
    analisis.data.familia,
  );
  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 400 });
  }
  return NextResponse.json(resultado);
}
