import { NextResponse } from "next/server";
import { pyGet } from "@/lib/py-api";

interface Contexto {
  params: Promise<{ corridaId: string }>;
}

/**
 * Descarga el `.gcode` de una corrida real (Supabase Storage, #25/#51) —
 * pide la URL firmada al servicio Python y reenvía los bytes tal cual, en
 * vez de redirigir: `descargarArchivo` (cliente) hace `fetch().blob()`
 * esperando el archivo directo, no una redirección cross-origin.
 */
export async function GET(_request: Request, { params }: Contexto) {
  // `descargarArchivo` (cliente) usa el mismo string para el nombre sugerido
  // del archivo Y el segmento de la URL -- viene con ".gcode" para lo primero,
  // hay que sacarlo para consultar por el corridaId real.
  const { corridaId: conExtension } = await params;
  const corridaId = decodeURIComponent(conExtension).replace(/\.gcode$/, "");

  let url: string;
  try {
    ({ url } = await pyGet<{ url: string }>(
      `descargas/gcode/${encodeURIComponent(corridaId)}`,
    ));
  } catch {
    return NextResponse.json(
      { error: "No se encontró el G-code de esta corrida." },
      { status: 404 },
    );
  }

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    return NextResponse.json(
      { error: "No se pudo descargar el G-code." },
      { status: 502 },
    );
  }
  const bytes = await respuesta.arrayBuffer();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${corridaId}.gcode"`,
    },
  });
}
