"""Parser del documento SVG completo: extrae el `viewBox` y los subpaths de
los elementos graficos que soporta (`path`, `ellipse`, `circle`, `rect`,
`line`, `polyline`, `polygon`).

Cualquier elemento con atributo `transform` (incluidos contenedores `<g>`)
levanta `ValueError` de inmediato: aplicar una transformacion silenciosamente
mal podria dibujar geometria en el lugar equivocado sin que se note a simple
vista hasta cortar/grabar la pieza real.
"""

from __future__ import annotations

import re
from pathlib import Path
from xml.etree import ElementTree as ET

from laser_toolkit.svg.bezier import PASOS_POR_DEFECTO
from laser_toolkit.svg.geometry import Punto, Subpath
from laser_toolkit.svg.path_parser import parsear_path

_NS = "{http://www.w3.org/2000/svg}"


def _local_tag(elemento: ET.Element) -> str:
    return elemento.tag.removeprefix(_NS)


def _num(texto: str | None, nombre: str) -> float:
    if texto is None:
        raise ValueError(f"falta el atributo requerido '{nombre}'")
    # Descarta sufijos de unidad (px, mm, pt, ...) -- se tratan como unidades
    # abstractas de todos modos, la escala real la define ancho_mm/alto_mm.
    coincidencia = re.match(r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?", texto.strip())
    if not coincidencia:
        raise ValueError(f"valor numerico invalido en '{nombre}': {texto!r}")
    return float(coincidencia.group())


def _elipse_a_subpath(
    cx: float, cy: float, rx: float, ry: float, pasos: int = 4 * PASOS_POR_DEFECTO
) -> Subpath:
    import math

    puntos: list[Punto] = [
        (cx + rx * math.cos(2 * math.pi * i / pasos), cy + ry * math.sin(2 * math.pi * i / pasos))
        for i in range(pasos)
    ]
    return Subpath(puntos=tuple(puntos), cerrado=True)


def _rect_a_subpath(x: float, y: float, w: float, h: float) -> Subpath:
    return Subpath(puntos=((x, y), (x + w, y), (x + w, y + h), (x, y + h)), cerrado=True)


def _puntos_a_subpath(texto: str, cerrado: bool) -> Subpath:
    numeros = [float(n) for n in re.findall(r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?", texto)]
    if len(numeros) % 2 != 0:
        raise ValueError(f"lista de puntos con cantidad impar de numeros: {texto!r}")
    puntos = [(numeros[i], numeros[i + 1]) for i in range(0, len(numeros), 2)]
    return Subpath(puntos=tuple(puntos), cerrado=cerrado)


def _recolectar_subpaths(elemento: ET.Element, subpaths: list[Subpath]) -> None:
    if elemento.get("transform") is not None:
        etiqueta = _local_tag(elemento)
        raise ValueError(
            f"elemento <{etiqueta}> tiene 'transform', no soportado -- "
            "aplanar las transformaciones antes de exportar el SVG (Inkscape: "
            "'Editar > Transformaciones aplicadas' o similar)"
        )

    etiqueta = _local_tag(elemento)
    if etiqueta == "path":
        d = elemento.get("d")
        if d:
            subpaths.extend(parsear_path(d))
    elif etiqueta == "ellipse":
        subpaths.append(
            _elipse_a_subpath(
                _num(elemento.get("cx"), "cx"),
                _num(elemento.get("cy"), "cy"),
                _num(elemento.get("rx"), "rx"),
                _num(elemento.get("ry"), "ry"),
            )
        )
    elif etiqueta == "circle":
        r = _num(elemento.get("r"), "r")
        subpaths.append(
            _elipse_a_subpath(_num(elemento.get("cx"), "cx"), _num(elemento.get("cy"), "cy"), r, r)
        )
    elif etiqueta == "rect":
        subpaths.append(
            _rect_a_subpath(
                _num(elemento.get("x", "0"), "x"),
                _num(elemento.get("y", "0"), "y"),
                _num(elemento.get("width"), "width"),
                _num(elemento.get("height"), "height"),
            )
        )
    elif etiqueta == "line":
        p1 = (_num(elemento.get("x1"), "x1"), _num(elemento.get("y1"), "y1"))
        p2 = (_num(elemento.get("x2"), "x2"), _num(elemento.get("y2"), "y2"))
        subpaths.append(Subpath(puntos=(p1, p2), cerrado=False))
    elif etiqueta == "polyline":
        subpaths.append(_puntos_a_subpath(elemento.get("points", ""), cerrado=False))
    elif etiqueta == "polygon":
        subpaths.append(_puntos_a_subpath(elemento.get("points", ""), cerrado=True))

    for hijo in elemento:
        _recolectar_subpaths(hijo, subpaths)


def _parsear_viewbox(raiz: ET.Element) -> tuple[float, float, float, float]:
    viewbox = raiz.get("viewBox")
    if viewbox:
        min_x, min_y, ancho, alto = (float(v) for v in re.split(r"[\s,]+", viewbox.strip()))
        return min_x, min_y, ancho, alto
    ancho = _num(raiz.get("width"), "width")
    alto = _num(raiz.get("height"), "height")
    return 0.0, 0.0, ancho, alto


def parsear_svg(ruta: str | Path) -> tuple[list[Subpath], tuple[float, float, float, float]]:
    """Parsea un archivo SVG completo.

    Devuelve `(subpaths, viewbox)`, con `viewbox = (min_x, min_y, ancho, alto)`
    en las unidades de usuario originales del SVG (sin escalar a milimetros
    todavia -- eso lo hace `laser_toolkit.svg.transform`).
    """
    raiz = ET.parse(Path(ruta)).getroot()
    viewbox = _parsear_viewbox(raiz)
    subpaths: list[Subpath] = []
    _recolectar_subpaths(raiz, subpaths)
    if not subpaths:
        raise ValueError(f"no se encontraron formas soportadas en {ruta}")
    return subpaths, viewbox
