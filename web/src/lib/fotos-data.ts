import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT } from "@/lib/fs-data";
import { slug } from "@/lib/slug";

const FOTOS_DIR = path.join(REPO_ROOT, "data", "fotos");
const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;

const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Nombre de archivo tal como lo devuelve `guardarFoto` — nunca una ruta con
 * segmentos, para que no pueda escaparse de data/fotos. */
function nombreValido(nombre: string): boolean {
  return /^[a-z0-9-]+_[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(nombre);
}

export async function guardarFoto(
  corridaId: string,
  celdaId: string,
  archivo: File,
): Promise<{ ok: true; nombre: string } | { ok: false; error: string }> {
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return { ok: false, error: "La foto pesa más de 8MB." };
  }
  const extensionOriginal = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = EXTENSIONES_PERMITIDAS[extensionOriginal];
  if (!mime) {
    return { ok: false, error: "Formato no soportado (usá jpg, png o webp)." };
  }

  const nombre = `${slug(corridaId)}_${slug(celdaId)}.${extensionOriginal}`;
  const bytes = Buffer.from(await archivo.arrayBuffer());
  await writeFile(path.join(FOTOS_DIR, nombre), bytes);
  return { ok: true, nombre };
}

export async function leerFoto(
  nombre: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!nombreValido(nombre)) return null;
  const extension = nombre.split(".").pop() ?? "";
  const mime = EXTENSIONES_PERMITIDAS[extension];
  if (!mime) return null;
  try {
    const bytes = await readFile(path.join(FOTOS_DIR, nombre));
    return { bytes, mime };
  } catch {
    return null;
  }
}
