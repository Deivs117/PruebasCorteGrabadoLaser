import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { rutaDescarga } from "@/lib/registro-data";

interface Contexto {
  params: Promise<{ archivo: string }>;
}

const MIME: Record<string, string> = {
  csv: "text/csv",
  gcode: "text/plain",
};

/**
 * Sirve el G-code/csv exactamente como lo dejó el sistema en
 * data/registros/ -- solo sigue en pie para crear una suite con SVG cargado
 * (issue #3, todavía local); todo lo demás descarga vía Storage
 * (`/api/descargas/gcode`, #51).
 */
export async function GET(_request: Request, { params }: Contexto) {
  const { archivo } = await params;
  const nombre = decodeURIComponent(archivo);
  const ruta = rutaDescarga(nombre);
  if (!ruta) {
    return NextResponse.json(
      { error: "Archivo no encontrado." },
      { status: 404 },
    );
  }

  try {
    const bytes = await readFile(ruta);
    const extension = nombre.split(".").pop() ?? "";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": MIME[extension] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Archivo no encontrado." },
      { status: 404 },
    );
  }
}
