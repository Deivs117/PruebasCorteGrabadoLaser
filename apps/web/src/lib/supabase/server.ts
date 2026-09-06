import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase Auth para Server Components/Route Handlers (issue
 * #52) -- lee la sesión de las cookies que ya refrescó el middleware.
 *
 * El `setAll` puede fallar si se llama desde un Server Component (no puede
 * escribir cookies, solo Route Handlers/Server Actions pueden) -- se
 * ignora a propósito: el middleware ya se encarga de refrescar la sesión
 * en cada request, este `catch` es solo para no romper el render.
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component: no puede setear cookies, ver docstring de arriba.
          }
        },
      },
    },
  );
}
