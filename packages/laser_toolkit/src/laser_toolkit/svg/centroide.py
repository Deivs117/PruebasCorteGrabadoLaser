"""Centroide de area real de un conjunto de subpaths (issue #196): formula
estandar de centroide de poligono (shoelace/Green), exacta y sin parametros
que ajustar -- a diferencia del centroide ponderado por intensidad de
`laser_toolkit.raster.centroide` (imagen rasterizada, necesita un umbral
para el caso opaco), un SVG ya es geometria vectorial, el area es exacta.

Se aplica la formula por separado a CADA subpath con al menos 3 puntos --
sin mirar `subpath.cerrado` -- y se combinan por area con signo: un diseño
con "agujeros" (ej. la letra 'O', o cualquier `path` con `fill-rule` que use
un subpath interior en sentido de giro opuesto al exterior) resta su area
sola, sin logica especial para detectar "cual subpath es el agujero" -- es
la misma propiedad que ya usa el renderizado SVG estandar (nonzero/evenodd)
para saber que rellenar.

Por que se ignora `subpath.cerrado`: ese campo solo indica si el `d` original
traia un comando `Z` explicito (relevante para el TRAZADO de contorno, ver
`Subpath`) -- muchos SVG reales (exportados de vectorizacion/Illustrator,
`fill` solido + `stroke="none"`) nunca usan `Z`, confian en el cierre
implicito del renderizador para el fill (valido y estandar en SVG: un
subpath sin `Z` igual se cierra a los fines de que area rellena). Filtrar
por `cerrado` dejaba esos SVG sin ningun subpath elegible pese a tener area
real. La formula de abajo (`_area_y_centroide_subpath`) ya envuelve el
indice con `(i + 1) % n`, o sea que matematicamente ya asume ese cierre
implicito para cualquier poligono -- el filtro era innecesariamente
estricto, no una necesidad de la formula.
"""

from __future__ import annotations

from laser_toolkit.svg.geometry import Punto, Subpath


def _area_y_centroide_subpath(subpath: Subpath) -> tuple[float, Punto]:
    """Area con signo (positiva = sentido antihorario) y centroide de UN
    subpath, tratado SIEMPRE como poligono cerrado sin importar
    `subpath.cerrado` -- ver la nota del modulo sobre por que ese campo no
    aplica aca."""
    puntos = subpath.puntos
    n = len(puntos)
    if n < 3:
        return 0.0, (0.0, 0.0)

    area2 = 0.0
    cx = 0.0
    cy = 0.0
    for i in range(n):
        x0, y0 = puntos[i]
        x1, y1 = puntos[(i + 1) % n]
        cruzado = x0 * y1 - x1 * y0
        area2 += cruzado
        cx += (x0 + x1) * cruzado
        cy += (y0 + y1) * cruzado

    if area2 == 0:
        # Poligono degenerado (puntos colineales o coincidentes): la formula
        # de centroide de area divide por area2, que aca es cero. El
        # promedio simple de vertices es la mejor aproximacion disponible: el
        # area que este subpath aporta a la combinacion total sigue siendo
        # 0, asi que no distorsiona el resultado si hay otros subpaths con
        # area real (ver `centroide_area_subpaths`).
        return 0.0, (sum(p[0] for p in puntos) / n, sum(p[1] for p in puntos) / n)

    area = area2 / 2
    return area, (cx / (3 * area2), cy / (3 * area2))


def centroide_area_subpaths(subpaths: list[Subpath]) -> Punto:
    """Centro de masa real del area encerrada por `subpaths`.

    TODO subpath con al menos 3 puntos aporta area, sin mirar
    `subpath.cerrado` (ver la nota del modulo -- ese campo no distingue
    "tiene area" de "no tiene area" en SVG real, muchos exports validos
    nunca marcan `Z`). Un subpath de 1-2 puntos (una linea suelta) no
    encierra ninguna region y se ignora. Levanta `ValueError` si ningun
    subpath tiene al menos 3 puntos, o si el area total combinada da
    exactamente cero (formas degeneradas, o areas que se cancelan entre
    si)."""
    candidatos = [sp for sp in subpaths if len(sp.puntos) >= 3]
    if not candidatos:
        raise ValueError(
            "No hay subpaths con al menos 3 puntos para calcular un "
            "centroide (el SVG solo tiene lineas sueltas)."
        )

    area_total = 0.0
    x_acumulado = 0.0
    y_acumulado = 0.0
    for subpath in candidatos:
        area, (cx, cy) = _area_y_centroide_subpath(subpath)
        area_total += area
        x_acumulado += area * cx
        y_acumulado += area * cy

    if area_total == 0:
        raise ValueError(
            "El area total de los subpaths es cero (formas degeneradas, o "
            "areas que se cancelan exactamente) -- no se puede calcular un "
            "centroide."
        )

    return (x_acumulado / area_total, y_acumulado / area_total)


__all__ = ["centroide_area_subpaths"]
