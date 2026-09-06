import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Confirma el magic link (issue #52).
 *
 * Bug real corregido (encontrado con un login real fallido): el SDK
 * (`@supabase/ssr`) pide el flujo PKCE (`code_challenge`, ver `login-form.tsx`)
 * -- con ese flujo, el template de email DEFAULT de Supabase (el único
 * disponible en el plan free, sin SMTP propio) apunta primero al `/verify`
 * de Supabase, que valida el link ahí mismo (confirma el email) y recién
 * DESPUÉS redirige acá con `?code=<auth_code>`, nunca con `token_hash`/`type`
 * -- esos solo existen si uno customiza el template para armar el link a
 * mano (`{{ .TokenHash }}`), que el plan free no permite. `auth.flow_state`
 * en Supabase confirmó esto: el `auth_code` quedaba generado y sin usar
 * mientras esta ruta buscaba en vano `token_hash`+`type` y mandaba a todos
 * a /auth/error pese a que el link era válido.
 *
 * Se deja el camino `token_hash`+`type` como respaldo (`verifyOtp`) por si
 * algún día se customiza el template -- pero `code` es el caso real hoy.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const siguiente = next && next.startsWith("/") ? next : "/";

  const supabase = await crearClienteServidor();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${siguiente}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${siguiente}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
