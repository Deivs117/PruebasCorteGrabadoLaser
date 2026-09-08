import { NextResponse } from "next/server";
import { listarFichas } from "@/lib/fichas-data";

/**
 * Proxy GET público de `listarFichas` (`@/lib/fichas-data`, `server-only`)
 * para el Editor de Diseño (#17): el modo Producción necesita consultar las
 * Fichas de Parámetro desde un componente de cliente (`panel-objeto.tsx`),
 * y ese módulo no se puede importar directo ahí. Devuelve TODAS las fichas
 * sin filtrar -- igual que `GET /fichas-parametro` en `apps/api` -- porque
 * el dataset es chico (todas las combinaciones material×espesor×operación
 * calibradas de un taller) y el filtrado por material+espesor+operación+
 * estado "oficial" se hace del lado del cliente (`fichas-cliente.ts`), sin
 * necesidad de un endpoint de query params dedicado en Python.
 */
export async function GET() {
  const fichas = await listarFichas();
  return NextResponse.json({ ok: true, fichas });
}
