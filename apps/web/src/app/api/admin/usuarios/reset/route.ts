import { NextResponse } from "next/server";
import { esCuentaMaestra, resetearPasswordAdmin } from "@/lib/admin-data";
import { resetearPasswordSchema } from "@/lib/admin-schema";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esCuentaMaestra(user?.email)) {
    return NextResponse.json(
      { ok: false, error: "No autorizado." },
      { status: 403 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = resetearPasswordSchema.safeParse(cuerpo);
  if (!analisis.success) {
    return NextResponse.json(
      {
        ok: false,
        error: analisis.error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  }

  try {
    const credencial = await resetearPasswordAdmin(
      analisis.data.email,
      analisis.data.password,
    );
    return NextResponse.json({ ok: true, credencial });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Error inesperado.",
      },
      { status: 400 },
    );
  }
}
