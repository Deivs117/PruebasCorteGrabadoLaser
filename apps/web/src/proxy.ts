import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección de rutas (issue #52): sin sesión activa, cualquier página real
 * redirige a `/login` -- la única ruta pública (login con email+contraseña,
 * sin magic link: no hay callback que proteger aparte). Corre en cada
 * request para refrescar el token de sesión (patrón estándar de
 * `@supabase/ssr` en Next.js).
 *
 * `proxy.ts`, no `middleware.ts`: esta versión de Next.js (16) renombró la
 * convención (ver AGENTS.md -- "esta NO es la versión que conocés").
 */
const RUTAS_PUBLICAS = ["/login"];

function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Nunca usar getSession() acá -- lee el JWT de la cookie sin validarlo
  // contra el servidor de Auth. getUser() sí lo valida en cada request,
  // que es justo lo que hace falta para una decisión de "dejar pasar o no".
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !esRutaPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
