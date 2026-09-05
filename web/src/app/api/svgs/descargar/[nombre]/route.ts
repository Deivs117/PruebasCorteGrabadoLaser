import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { rutaGcodeDescarga } from "@/lib/svg-data";

interface Contexto {
  params: Promise<{ nombre: string }>;
}

export async function GET(_request: Request, { params }: Contexto) {
  const { nombre } = await params;
  const ruta = rutaGcodeDescarga(decodeURIComponent(nombre));
  if (!ruta) {
    return NextResponse.json(
      { error: "Archivo no encontrado." },
      { status: 404 },
    );
  }

  try {
    const bytes = await readFile(ruta);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${decodeURIComponent(nombre)}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Archivo no encontrado." },
      { status: 404 },
    );
  }
}
