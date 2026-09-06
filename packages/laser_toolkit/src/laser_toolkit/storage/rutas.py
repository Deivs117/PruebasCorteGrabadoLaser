"""Cálculo de rutas dentro de cada bucket de Storage (issue #25) -- funciones
puras, sin red, para que la organización de carpetas quede testeada sin
depender de una Supabase real.

Organización elegida: `<material_slug>/<...>` en los tres buckets, para que
el dashboard de Storage se pueda navegar por material igual que
`docs/materiales/<material>/` organizaba los documentos técnicos antes de
la limpieza de docs. Dentro de cada material:

- `gcode`: un archivo por corrida -- el `corrida_id` ya es único (constraint
  de `Registro`), alcanza como nombre de archivo.
- `svg`: un archivo por suite (`Suite.svg_storage_key`) -- se nombra por el
  id de la suite, no por el nombre original subido, para no chocar si dos
  personas suben un archivo con el mismo nombre.
- `fotos`: una por medición, anidada además por corrida (puede haber muchas
  mediciones con foto en una misma corrida).
"""

from __future__ import annotations

from laser_toolkit.naming import slug_material


def ruta_gcode(material: str, corrida_id: str) -> str:
    return f"{slug_material(material)}/{corrida_id}.gcode"


def ruta_svg(material: str, suite_id: int) -> str:
    return f"{slug_material(material)}/suite-{suite_id}.svg"


def ruta_foto(material: str, corrida_id: str, id_prueba: str, extension: str = "jpg") -> str:
    return f"{slug_material(material)}/{corrida_id}/{id_prueba}.{extension}"


# Prefijo fijo separado de `<material_slug>/` a propósito: un SVG de la
# biblioteca de "Grabado Vectorial" (issue #3) no está asociado a ninguna
# Suite/material todavía -- es una copia de trabajo suelta que se sube,
# convierte y eventualmente se descarta, no la geometría oficial de una
# suite (`ruta_svg`). Reemplaza `data/svgs/` (filesystem local, no
# sobrevive en la función serverless de Vercel).
PREFIJO_BIBLIOTECA_SVG = "biblioteca"


def ruta_svg_biblioteca(nombre: str) -> str:
    return f"{PREFIJO_BIBLIOTECA_SVG}/{nombre}"
