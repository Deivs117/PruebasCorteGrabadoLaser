"""Decodificacion de la imagen subida (issue #15) -- PNG y JPEG unicamente
(decision tomada en #3), con downscale automatico si excede el tope de
dimension nativa (`DIMENSION_MAXIMA_PX`, ver `raster.config`)."""

from __future__ import annotations

import io

from PIL import Image

from laser_toolkit.raster.config import DIMENSION_MAXIMA_PX

FORMATOS_ACEPTADOS = {"PNG", "JPEG"}


def decodificar_imagen(datos: bytes) -> Image.Image:
    """Decodifica `datos` (bytes crudos del archivo subido) y aplica downscale
    automatico si hace falta. Levanta `ValueError` si el formato no es PNG ni
    JPEG -- nunca intenta adivinar/convertir un formato no soportado."""
    try:
        imagen = Image.open(io.BytesIO(datos))
        imagen.load()
    except Exception as error:  # noqa: BLE001 -- Pillow levanta varios tipos segun el problema
        raise ValueError(f"No se pudo decodificar la imagen: {error}") from error

    if imagen.format not in FORMATOS_ACEPTADOS:
        raise ValueError(
            f"Formato de imagen no soportado: '{imagen.format}'. Formatos aceptados: "
            f"{', '.join(sorted(FORMATOS_ACEPTADOS))}."
        )

    return _downscale_si_excede(imagen)


def _downscale_si_excede(imagen: Image.Image, dimension_maxima_px: int = DIMENSION_MAXIMA_PX) -> Image.Image:
    lado_mayor = max(imagen.size)
    if lado_mayor <= dimension_maxima_px:
        return imagen

    factor = dimension_maxima_px / lado_mayor
    nuevo_tamano = (max(1, round(imagen.width * factor)), max(1, round(imagen.height * factor)))
    return imagen.resize(nuevo_tamano, Image.Resampling.LANCZOS)
