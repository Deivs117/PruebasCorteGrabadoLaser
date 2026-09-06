"""Canal/perfil de conversion -> matriz de intensidad (issue #15).

Pipeline, en este orden: redimensionar a la grilla de muestreo real ->
extraer canal/mezcla -> gamma -> invertir -> posterizar. Redimensionar
primero (en vez de al final) importa para que el posterizado quede nitido
por celda de la grilla -- reescalar despues de posterizar reintroduce
valores intermedios por interpolacion y arruina los niveles discretos.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import cast

from PIL import Image, ImageChops

from laser_toolkit.raster.config import CanalRaster, ConfiguracionRaster


def calcular_matriz_intensidad(
    imagen: Image.Image, ancho_mm: float, alto_mm: float, config: ConfiguracionRaster
) -> list[list[float]]:
    """Matriz [fila][columna] de intensidad 0.0-1.0 (1.0 = pixel mas oscuro =
    mas potencia, salvo `config.invertir`), ya redimensionada a la grilla de
    muestreo real: `round(alto_mm/resolucion_mm)` filas x
    `round(ancho_mm/resolucion_mm)` columnas -- una fila = una linea de
    barrido en zigzag (ver `raster.gcode`). Fila 0 = borde superior de la
    imagen (misma convencion de Y invertido que `laser_toolkit.svg.transform`)."""
    n_columnas = max(1, round(ancho_mm / config.resolucion_mm))
    n_filas = max(1, round(alto_mm / config.resolucion_mm))

    rgb = imagen.convert("RGB").resize((n_columnas, n_filas), Image.Resampling.LANCZOS)
    claridad = _extraer_canal(rgb, config)
    claridad = _aplicar_gamma(claridad, config.gamma)
    intensidad = claridad if config.invertir else ImageChops.invert(claridad)
    if config.niveles_posterizado is not None:
        intensidad = _posterizar(intensidad, config.niveles_posterizado)

    # `getdata()` en vez de `.load()`: el modo "L" siempre devuelve enteros,
    # pero los stubs de Pillow tipan ambos como una union generica (podrian
    # ser tuplas en un modo multi-banda) -- `cast` documenta esa garantia en
    # vez de dejar pasar el tipo ambiguo.
    datos = cast("Sequence[int]", intensidad.getdata())
    ancho_px, alto_px = intensidad.size
    return [[datos[y * ancho_px + x] / 255 for x in range(ancho_px)] for y in range(alto_px)]


def _extraer_canal(rgb: Image.Image, config: ConfiguracionRaster) -> Image.Image:
    if config.canal == CanalRaster.LUMINANCIA:
        return rgb.convert("L")
    if config.canal == CanalRaster.ROJO:
        return rgb.getchannel("R")
    if config.canal == CanalRaster.VERDE:
        return rgb.getchannel("G")
    if config.canal == CanalRaster.AZUL:
        return rgb.getchannel("B")

    # MEZCLA: suma ponderada de los 3 canales, via tabla de 256 entradas
    # (mismo enfoque que `_aplicar_gamma`/`_posterizar` -- evita la ambiguedad
    # de tipos de pasarle una lambda a `.point()`). Cada peso esta en [0, 1]
    # (ver `ConfiguracionRaster`), asi que ningun canal individual desborda
    # 255; la suma si podria (pesos que sumen > 1) -- `ImageChops.add` la
    # clampea a 255 por default, que es exactamente el comportamiento deseado.
    r, g, b = rgb.split()
    r = r.point(_tabla_peso(config.peso_rojo))
    g = g.point(_tabla_peso(config.peso_verde))
    b = b.point(_tabla_peso(config.peso_azul))
    return ImageChops.add(ImageChops.add(r, g), b)


def _tabla_peso(peso: float) -> list[int]:
    return [round(i * peso) for i in range(256)]


def _aplicar_gamma(canal: Image.Image, gamma: float) -> Image.Image:
    if gamma == 1.0:
        return canal
    tabla = [round(255 * (i / 255) ** (1 / gamma)) for i in range(256)]
    return canal.point(tabla)


def _posterizar(canal: Image.Image, niveles: int) -> Image.Image:
    """Reduce a `niveles` valores discretos entre 0 y 255 -- a diferencia de
    `PIL.ImageOps.posterize` (que solo admite potencias de 2 via bits), esto
    acepta cualquier cantidad de niveles entre 2 y 256."""
    paso = 255 / (niveles - 1)
    tabla = [round(round(i / paso) * paso) for i in range(256)]
    return canal.point(tabla)
