"""Aplanado de curvas Bezier cubicas y cuadraticas a segmentos rectos.

Muestreo por pasos fijos (no adaptativo): mas simple y predecible que una
subdivision adaptativa, suficiente para la escala de un logo o icono grabado
con laser. `pasos` es ajustable si una curva concreta necesita mas o menos
resolucion.
"""

from __future__ import annotations

from laser_toolkit.svg.geometry import Punto

PASOS_POR_DEFECTO = 16


def aplanar_cubica(p0: Punto, p1: Punto, p2: Punto, p3: Punto, pasos: int = PASOS_POR_DEFECTO) -> list[Punto]:
    """Puntos intermedios de una curva Bezier cubica (excluye `p0`, incluye `p3`)."""
    if pasos < 1:
        raise ValueError("pasos debe ser >= 1")
    puntos: list[Punto] = []
    for i in range(1, pasos + 1):
        t = i / pasos
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        puntos.append((x, y))
    return puntos


def aplanar_cuadratica(p0: Punto, p1: Punto, p2: Punto, pasos: int = PASOS_POR_DEFECTO) -> list[Punto]:
    """Puntos intermedios de una curva Bezier cuadratica (excluye `p0`, incluye `p2`)."""
    if pasos < 1:
        raise ValueError("pasos debe ser >= 1")
    puntos: list[Punto] = []
    for i in range(1, pasos + 1):
        t = i / pasos
        mt = 1 - t
        x = mt**2 * p0[0] + 2 * mt * t * p1[0] + t**2 * p2[0]
        y = mt**2 * p0[1] + 2 * mt * t * p1[1] + t**2 * p2[1]
        puntos.append((x, y))
    return puntos
