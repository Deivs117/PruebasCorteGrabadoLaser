import { NextResponse } from "next/server";
import { guardarTarifas } from "@/lib/tarifas-data";
import { tarifasSchema } from "@/lib/tarifas-schema";

export async function PUT(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = tarifasSchema.safeParse(cuerpo);

  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  const claves = new Set(
    analisis.data.preciosMaterial.map((p) => `${p.material}_${p.espesorMm}`),
  );
  if (claves.size !== analisis.data.preciosMaterial.length) {
    return NextResponse.json(
      { ok: false, error: "Hay un material con el mismo espesor repetido." },
      { status: 400 },
    );
  }

  await guardarTarifas(analisis.data);
  return NextResponse.json({ ok: true });
}
