import { NextResponse } from "next/server";

/**
 * Prueba end-to-end del patrón definido en #47: esta ruta (Node.js) llama al
 * servicio Python interno (`apps/api`, FastAPI) vía el binding de Vercel
 * (env var `PY_API_URL`, nunca hardcodeada ni pública) para confirmar que
 * `laser_toolkit` está empaquetado correctamente y puede hablarle a Supabase
 * desde el runtime real. No es un endpoint de negocio — ver #48-#51 para eso.
 */
export async function GET() {
  const baseUrl = process.env.PY_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PY_API_URL no está configurada (solo existe en Vercel, vía el binding a `api`).",
      },
      { status: 500 },
    );
  }

  const respuesta = await fetch(new URL("health", baseUrl));
  const datos: unknown = await respuesta.json();
  return NextResponse.json(datos, { status: respuesta.status });
}
