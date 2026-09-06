"""Biblioteca de SVGs de 'Grabado Vectorial' (issue #3, migración post-#47):
antes vivía en `data/svgs/` -- filesystem local que no sobrevive en la
función serverless de Vercel (el error real de producción era un ENOENT al
intentar leer un archivo subido en una invocación anterior). Ahora vive en
Supabase Storage (bucket `svg`, prefijo `biblioteca/`, ver
`laser_toolkit.storage.rutas.ruta_svg_biblioteca`) -- separado del SVG
propio de una Suite (`Suite.svg_storage_key`).

Sin dependencia de FastAPI a propósito (mismo patrón que el resto de
`apps/api`): `ValueError` en los casos de error de negocio, `main.py` los
traduce a HTTP.
"""

from __future__ import annotations

import re
import time

from laser_toolkit.config import MachineConfig
from laser_toolkit.storage.operaciones import (
    BUCKET_SVG,
    descargar,
    eliminar,
    listar_svgs_biblioteca,
    subir_svg_biblioteca,
)
from laser_toolkit.storage.rutas import ruta_svg_biblioteca
from laser_toolkit.svg.api import convertir_svg_texto_a_gcode
from laser_toolkit.svg.modo import ModoGrabadoSvg
from supabase import Client

_NOMBRE_VALIDO = re.compile(r"^[a-z0-9-]+\.svg$")


def _slug(nombre_original: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", nombre_original.lower()).strip("-")
    return base or "svg"


def _nombre_valido(nombre: str) -> bool:
    """Nunca una ruta con segmentos ni un nombre fuera del patrón que
    genera `subir()` -- que no pueda escaparse de `biblioteca/`."""
    return bool(_NOMBRE_VALIDO.match(nombre))


def listar(cliente: Client) -> list[dict]:
    """Espejo de `listarSvgsConContenido` en `svg-data.ts`. El contenido de
    cada archivo se pide aparte (biblioteca personal, tamaño manejable) --
    ver el docstring de `listar_svgs_biblioteca`."""
    archivos = [a for a in listar_svgs_biblioteca(cliente) if a.get("name", "").endswith(".svg")]
    resultado = []
    for archivo in archivos:
        nombre = archivo["name"]
        contenido = descargar(cliente, BUCKET_SVG, ruta_svg_biblioteca(nombre)).decode("utf-8")
        resultado.append(
            {
                "nombre": nombre,
                "contenido": contenido,
                "subidoEn": archivo.get("created_at") or "",
            }
        )
    resultado.sort(key=lambda item: item["subidoEn"], reverse=True)
    return resultado


def subir(cliente: Client, nombre_original: str, contenido: str) -> dict:
    """Espejo de `guardarSvg` en `svg-data.ts`. El nombre final incluye un
    sufijo de tiempo (igual que antes) para no chocar si dos personas suben
    un archivo con el mismo nombre."""
    if not nombre_original.lower().endswith(".svg"):
        raise ValueError("Tiene que ser un archivo .svg.")
    base = _slug(nombre_original[:-4])  # recorta ".svg" (4 caracteres, sin importar mayúsculas)
    nombre = f"{base}-{int(time.time() * 1000):x}.svg"
    subir_svg_biblioteca(cliente, nombre, contenido.encode("utf-8"))
    return {"ok": True, "nombre": nombre, "contenido": contenido}


def eliminar_svg(cliente: Client, nombre: str) -> None:
    if not _nombre_valido(nombre):
        raise ValueError("Archivo inválido.")
    eliminar(cliente, BUCKET_SVG, ruta_svg_biblioteca(nombre))


def convertir(
    cliente: Client,
    nombre: str,
    *,
    ancho_mm: float,
    alto_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    modo: str,
    resolucion_relleno_mm: float,
    machine: MachineConfig,
) -> list[str]:
    """Espejo de `convertirSvg` en `svg-data.ts`. Reemplaza
    `execFile("uv", ["run", ..., "svg-to-gcode", ...])` (el hallazgo de #47:
    ese subproceso tampoco sobrevive en Vercel) por una llamada directa a
    `laser_toolkit.svg.api.convertir_svg_texto_a_gcode`, en el mismo
    servicio Python."""
    if not _nombre_valido(nombre):
        raise ValueError("Archivo inválido.")
    contenido = descargar(cliente, BUCKET_SVG, ruta_svg_biblioteca(nombre)).decode("utf-8")
    return convertir_svg_texto_a_gcode(
        contenido,
        ancho_mm,
        alto_mm,
        velocidad_mm_min,
        potencia_pct,
        machine,
        modo=ModoGrabadoSvg(modo),
        resolucion_relleno_mm=resolucion_relleno_mm,
    )


__all__ = ["convertir", "eliminar_svg", "listar", "subir"]
