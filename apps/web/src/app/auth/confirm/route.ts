import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Confirma el magic link (issue #52): Supabase Auth no manda un `code` de
 * OAuth acá, manda `token_hash`+`type` (patrón estándar de Auth por email,
 * distinto del flujo OAuth con `exchangeCodeForSession`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const siguiente = next && next.startsWith("/") ? next : "/";

  if (tokenHash && type) {
    const supabase = await crearClienteServidor();
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
