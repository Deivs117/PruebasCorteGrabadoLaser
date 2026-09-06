import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase Auth para el navegador (issue #52). Solo se usa para
 * Auth (login/logout/sesión) -- nunca para leer o escribir datos del taller,
 * esa decisión ya está tomada en #1: todas las escrituras pasan por el
 * servicio Python (`apps/api`), nunca directo desde el cliente.
 *
 * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` son públicas a
 * propósito (la anon key no da acceso a nada sin Row Level Security, y este
 * proyecto no tiene tablas expuestas por PostgREST) -- ver `.env.example`.
 */
export function crearClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
