"""Tipos geometricos comunes del modulo SVG.

Un `Subpath` es una polilinea ya aplanada (curvas convertidas a segmentos
rectos): la unidad atomica que consumen tanto el trazado de contorno como el
relleno por trama. Se usa `tuple` (no `list`) para que sea inmutable y
hasheable, util al testear.
"""

from __future__ import annotations

from dataclasses import dataclass

Punto = tuple[float, float]


@dataclass(frozen=True)
class Subpath:
    """Una polilinea de un path SVG, ya aplanada.

    `cerrado` indica si el path original terminaba en `Z`/`z` (relevante para
    el TRAZADO de contorno: un subpath abierto no debe cerrarse con una linea
    extra). El RELLENO ignora este campo -- el relleno vectorial siempre trata
    los subpaths como cerrados, igual que el motor de renderizado de SVG.
    """

    puntos: tuple[Punto, ...]
    cerrado: bool
