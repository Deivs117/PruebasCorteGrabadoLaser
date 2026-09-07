import { NextResponse } from "next/server";
import {
  crearUsuarioAdmin,
  esCuentaMaestra,
  listarUsuariosAdmin,
} from "@/lib/admin-data";
import { crearUsuarioSchema } from "@/lib/admin-schema";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Panel de Generación de Credenciales (#117): el gate de "solo cuenta
 * maestra" se valida acá, no en `apps/api` -- este route handler ya conoce
 * la sesión (vía `crearClienteServidor`), Python no necesita saber qué es
 * una "cuenta maestra". El middleware (`proxy.ts`) ya garantiza que hay
 * sesión antes de llegar hasta acá; lo que falta validar es que sea LA
 * cuenta maestra.
 */
async function requiereCuentaMaestra(): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return esCuentaMaestra(user?.email) ? null : "No autorizado.";
}

export async function GET() {
  const error = await requiereCuentaMaestra();
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const usuarios = await listarUsuariosAdmin();
  return NextResponse.json({ ok: true, usuarios });
}

export async function POST(request: Request) {
  const error = await requiereCuentaMaestra();
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const analisis = crearUsuarioSchema.safeParse(cuerpo);
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
    const credencial = await crearUsuarioAdmin(
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
