"""Subir/descargar/eliminar archivos en los buckets de Storage (issue #25).

Los tres buckets (`gcode`, `svg`, `fotos`) se crearon como PRIVADOS en #23 --
nunca hay una URL pública directa; para dar acceso de lectura se genera una
URL firmada con expiración (`url_firmada`).

Estas funciones reciben el `Client` ya creado (`storage.client.crear_cliente_storage`)
en vez de crearlo ellas mismas, mismo patrón que `laser_toolkit.db.repo_*`
recibe una `Session` -- facilita testear con un cliente falso/mockeado sin
tocar red.
"""

from __future__ import annotations

from typing import cast

from storage3.types import FileOptions
from supabase import Client

from laser_toolkit.storage.rutas import ruta_foto, ruta_gcode, ruta_svg

BUCKET_GCODE = "gcode"
BUCKET_SVG = "svg"
BUCKET_FOTOS = "fotos"


def _opciones(content_type: str) -> FileOptions:
    # upsert: regenerar una suite con el mismo corrida_id (ej. corregir un
    # parámetro y volver a correr `generate-cut`) debe reemplazar el archivo
    # anterior, no fallar con un error de "ya existe".
    return cast("FileOptions", {"upsert": "true", "content-type": content_type})


def subir_gcode(cliente: Client, material: str, corrida_id: str, contenido: bytes) -> str:
    """Sube el .gcode de una corrida. Devuelve la key de Storage a guardar en
    `Registro.gcode_storage_key` (ver `laser_toolkit.db.repo_pruebas.guardar_gcode_key`)."""
    key = ruta_gcode(material, corrida_id)
    cliente.storage.from_(BUCKET_GCODE).upload(key, contenido, file_options=_opciones("text/plain"))
    return key


def subir_svg(cliente: Client, material: str, suite_id: int, contenido: bytes) -> str:
    """Sube el SVG usado por una suite. Devuelve la key -- va en
    `Suite.svg_storage_key`."""
    key = ruta_svg(material, suite_id)
    cliente.storage.from_(BUCKET_SVG).upload(key, contenido, file_options=_opciones("image/svg+xml"))
    return key


_CONTENT_TYPE_POR_EXTENSION = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


def subir_foto(
    cliente: Client, material: str, corrida_id: str, id_prueba: str, contenido: bytes, extension: str = "jpg"
) -> str:
    """Sube la foto de evaluación de una celda (o de `id_prueba="bateria"`
    para la foto de toda la batería, issue #51). Devuelve la key -- va en
    `Medicion.foto_storage_key`/`Registro.foto_bateria_storage_key`."""
    content_type = _CONTENT_TYPE_POR_EXTENSION.get(extension)
    if content_type is None:
        raise ValueError(f"Formato de foto no soportado: '{extension}' (usá jpg, jpeg, png o webp).")
    key = ruta_foto(material, corrida_id, id_prueba, extension)
    cliente.storage.from_(BUCKET_FOTOS).upload(key, contenido, file_options=_opciones(content_type))
    return key


def descargar(cliente: Client, bucket: str, key: str) -> bytes:
    return cliente.storage.from_(bucket).download(key)


def eliminar(cliente: Client, bucket: str, key: str) -> None:
    cliente.storage.from_(bucket).remove([key])


def url_firmada(cliente: Client, bucket: str, key: str, expiracion_s: int = 3600) -> str:
    """URL de lectura temporal -- los buckets son privados, no hay URL
    pública directa. `expiracion_s` default 1 hora."""
    respuesta = cliente.storage.from_(bucket).create_signed_url(key, expiracion_s)
    url = respuesta.get("signedURL")
    if not url:
        raise RuntimeError(f"Supabase Storage no devolvió una URL firmada para '{bucket}/{key}': {respuesta}")
    return url
