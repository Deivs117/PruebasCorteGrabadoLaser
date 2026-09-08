import { NextResponse } from "next/server";
import { crearProyecto } from "@/lib/proyectos-data";
import { guardarProyectoSchema } from "@/lib/proyecto-schema";

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = guardarProyectoSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const resultado = await crearProyecto(analisis.data);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 422 });
}
