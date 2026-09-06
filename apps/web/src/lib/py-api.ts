import "server-only";

/**
 * Cliente mínimo hacia el servicio Python interno (`apps/api`, ver #47).
 * `PY_API_URL` la inyecta Vercel vía el binding declarado en `vercel.json` --
 * nunca hardcodeada, nunca pública. En desarrollo local (sin `vercel dev`)
 * no existe, así que cada función que la usa falla con un mensaje claro en
 * vez de un `fetch` a `undefined`.
 */
function baseUrl(): string {
  const url = process.env.PY_API_URL;
  if (!url) {
    throw new Error(
      "PY_API_URL no está configurada -- solo existe corriendo en Vercel (o `vercel dev`), vía el binding a `api`.",
    );
  }
  return url;
}

async function manejarRespuesta<T>(respuesta: Response): Promise<T> {
  if (!respuesta.ok) {
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    const detalle =
      cuerpo && typeof cuerpo === "object" && "detail" in cuerpo
        ? String((cuerpo as { detail: unknown }).detail)
        : `HTTP ${respuesta.status}`;
    throw new Error(detalle);
  }
  return (await respuesta.json()) as T;
}

export async function pyGet<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(new URL(ruta, baseUrl()), {
    cache: "no-store",
  });
  return manejarRespuesta<T>(respuesta);
}

export async function pyPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(new URL(ruta, baseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return manejarRespuesta<T>(respuesta);
}

export async function pyPut<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(new URL(ruta, baseUrl()), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return manejarRespuesta<T>(respuesta);
}

export async function pyDelete<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(new URL(ruta, baseUrl()), { method: "DELETE" });
  return manejarRespuesta<T>(respuesta);
}

/** Reenvía un `FormData` (ej. la foto de una celda, C/#60) tal cual --
 * `fetch` arma el `multipart/form-data` solo con pasarlo como `body`, no
 * hace falta serializarlo a mano. */
export async function pyPostForm<T>(
  ruta: string,
  formData: FormData,
): Promise<T> {
  const respuesta = await fetch(new URL(ruta, baseUrl()), {
    method: "POST",
    body: formData,
  });
  return manejarRespuesta<T>(respuesta);
}
