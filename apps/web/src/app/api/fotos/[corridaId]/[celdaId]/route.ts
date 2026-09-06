import { NextResponse } from "next/server";
import { pyDelete, pyGet, pyPostForm } from "@/lib/py-api";
import { CELDA_ID_BATERIA } from "@/lib/foto-bateria";

interface Contexto {
  params: Promise<{ corridaId: string; celdaId: string }>;
}

/** Fotos de evaluación (#51): por celda puntual (`fotos/{corridaId}/{idPrueba}`
 * en Python) o de toda la batería (`fotos-bateria/{corridaId}`, ruta
 * distinta del lado de Python) -- acá conviven bajo un solo segmento
 * dinámico (`celdaId === CELDA_ID_BATERIA`), igual que ya identifica la foto
 * de batería `PhotoCell` del lado del cliente. */
function rutaPython(corridaId: string, celdaId: string): string {
  return celdaId === CELDA_ID_BATERIA
    ? `fotos-bateria/${encodeURIComponent(corridaId)}`
    : `fotos/${encodeURIComponent(corridaId)}/${encodeURIComponent(celdaId)}`;
}

/** Los buckets de Storage son privados (#23): no hay URL pública, así que
 * esto redirige a una URL firmada de 1h en vez de servir los bytes -- un
 * <img> sigue la redirección sin que el frontend tenga que manejarla. */
export async function GET(_request: Request, { params }: Contexto) {
  const { corridaId, celdaId } = await params;
  try {
    const { url } = await pyGet<{ url: string }>(
      `${rutaPython(corridaId, celdaId)}/url`,
    );
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: Contexto) {
  const { corridaId, celdaId } = await params;
  const formulario = await request.formData().catch(() => null);
  const archivo = formulario?.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Falta el archivo." },
      { status: 400 },
    );
  }

  const envio = new FormData();
  envio.set("archivo", archivo);
  try {
    const resultado = await pyPostForm<{ ok: boolean; fotoStorageKey: string }>(
      rutaPython(corridaId, celdaId),
      envio,
    );
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo subir la foto.",
      },
      { status: 422 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { corridaId, celdaId } = await params;
  try {
    await pyDelete(rutaPython(corridaId, celdaId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar la foto." },
      { status: 422 },
    );
  }
}
