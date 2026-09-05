"""Parser del atributo `d` de un elemento SVG `<path>`.

Soporta los comandos mas comunes: `M/m L/l H/h V/v C/c S/s Q/q T/t Z/z`
(absolutos y relativos). NO soporta arcos (`A/a`): un path con arcos levanta
`ValueError` explicito en vez de dibujar geometria incorrecta en silencio.

Referencia del formato: https://www.w3.org/TR/SVG11/paths.html#PathData
"""

from __future__ import annotations

import re

from laser_toolkit.svg.bezier import aplanar_cuadratica, aplanar_cubica
from laser_toolkit.svg.geometry import Punto, Subpath

_RE_COMANDO = re.compile(r"([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)")
_RE_NUMERO = re.compile(r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?")

_COMANDOS_SIN_SOPORTE = {"A", "a"}


def _numeros(texto: str) -> list[float]:
    return [float(n) for n in _RE_NUMERO.findall(texto)]


def _en_grupos(valores: list[float], tamano: int, comando: str) -> list[tuple[float, ...]]:
    if tamano == 0 or len(valores) % tamano != 0:
        raise ValueError(f"comando '{comando}': cantidad de numeros invalida ({len(valores)})")
    return [tuple(valores[i : i + tamano]) for i in range(0, len(valores), tamano)]


def parsear_path(d: str) -> list[Subpath]:
    """Convierte el atributo `d` de un `<path>` en una lista de `Subpath` aplanados."""
    subpaths: list[Subpath] = []
    puntos_actuales: list[Punto] = []
    actual: Punto = (0.0, 0.0)
    inicio_subpath: Punto = (0.0, 0.0)
    control_cubica_anterior: Punto | None = None
    control_cuadratica_anterior: Punto | None = None

    def cerrar_subpath_actual(cerrado: bool) -> None:
        nonlocal puntos_actuales
        if puntos_actuales:
            subpaths.append(Subpath(puntos=tuple(puntos_actuales), cerrado=cerrado))
        puntos_actuales = []

    for letra, argumentos in _RE_COMANDO.findall(d):
        if letra in _COMANDOS_SIN_SOPORTE:
            raise ValueError(
                "los arcos SVG ('A'/'a') no estan soportados por el parser -- "
                "reexportar el path como curvas Bezier o lineas rectas"
            )

        comando = letra.upper()
        relativo = letra.islower()
        valores = _numeros(argumentos)

        # Solo C/S/Q/T "encadenan" el punto de control reflejado; cualquier
        # otro comando en el medio invalida el reflejo (regla del spec SVG).
        mantiene_control_cubica = comando in ("C", "S")
        mantiene_control_cuadratica = comando in ("Q", "T")

        if comando == "M":
            cerrar_subpath_actual(cerrado=False)
            (x, y), *resto = _en_grupos(valores, 2, letra)
            actual = (actual[0] + x, actual[1] + y) if relativo else (x, y)
            inicio_subpath = actual
            puntos_actuales = [actual]
            # Pares adicionales tras el M inicial se tratan como L implicito.
            for dx, dy in resto:
                actual = (actual[0] + dx, actual[1] + dy) if relativo else (dx, dy)
                puntos_actuales.append(actual)

        elif comando == "L":
            for x, y in _en_grupos(valores, 2, letra):
                actual = (actual[0] + x, actual[1] + y) if relativo else (x, y)
                puntos_actuales.append(actual)

        elif comando == "H":
            for (x,) in _en_grupos(valores, 1, letra):
                actual = (actual[0] + x, actual[1]) if relativo else (x, actual[1])
                puntos_actuales.append(actual)

        elif comando == "V":
            for (y,) in _en_grupos(valores, 1, letra):
                actual = (actual[0], actual[1] + y) if relativo else (actual[0], y)
                puntos_actuales.append(actual)

        elif comando == "C":
            for x1, y1, x2, y2, x, y in _en_grupos(valores, 6, letra):
                p1 = (actual[0] + x1, actual[1] + y1) if relativo else (x1, y1)
                p2 = (actual[0] + x2, actual[1] + y2) if relativo else (x2, y2)
                fin = (actual[0] + x, actual[1] + y) if relativo else (x, y)
                puntos_actuales.extend(aplanar_cubica(actual, p1, p2, fin))
                control_cubica_anterior = p2
                actual = fin

        elif comando == "S":
            for x2, y2, x, y in _en_grupos(valores, 4, letra):
                if control_cubica_anterior is not None:
                    p1 = (
                        2 * actual[0] - control_cubica_anterior[0],
                        2 * actual[1] - control_cubica_anterior[1],
                    )
                else:
                    p1 = actual
                p2 = (actual[0] + x2, actual[1] + y2) if relativo else (x2, y2)
                fin = (actual[0] + x, actual[1] + y) if relativo else (x, y)
                puntos_actuales.extend(aplanar_cubica(actual, p1, p2, fin))
                control_cubica_anterior = p2
                actual = fin

        elif comando == "Q":
            for x1, y1, x, y in _en_grupos(valores, 4, letra):
                p1 = (actual[0] + x1, actual[1] + y1) if relativo else (x1, y1)
                fin = (actual[0] + x, actual[1] + y) if relativo else (x, y)
                puntos_actuales.extend(aplanar_cuadratica(actual, p1, fin))
                control_cuadratica_anterior = p1
                actual = fin

        elif comando == "T":
            for x, y in _en_grupos(valores, 2, letra):
                if control_cuadratica_anterior is not None:
                    p1 = (
                        2 * actual[0] - control_cuadratica_anterior[0],
                        2 * actual[1] - control_cuadratica_anterior[1],
                    )
                else:
                    p1 = actual
                fin = (actual[0] + x, actual[1] + y) if relativo else (x, y)
                puntos_actuales.extend(aplanar_cuadratica(actual, p1, fin))
                control_cuadratica_anterior = p1
                actual = fin

        elif comando == "Z":
            actual = inicio_subpath
            cerrar_subpath_actual(cerrado=True)

        else:  # pragma: no cover -- ya filtrado por _RE_COMANDO, defensivo
            raise ValueError(f"comando de path no reconocido: {letra!r}")

        if not mantiene_control_cubica:
            control_cubica_anterior = None
        if not mantiene_control_cuadratica:
            control_cuadratica_anterior = None

    cerrar_subpath_actual(cerrado=False)
    return subpaths
