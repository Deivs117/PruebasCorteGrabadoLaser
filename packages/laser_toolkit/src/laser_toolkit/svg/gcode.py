"""Emision de G-code para el contorno y el relleno de un conjunto de subpaths
ya escalados a milimetros (ver `laser_toolkit.svg.transform`), reutilizando
las mismas convenciones de `laser_toolkit.gcode.writer` (M4 dinamico, valor S
segun `MachineConfig.laser_max_s`).
"""

from __future__ import annotations

import math

from laser_toolkit.config import MachineConfig
from laser_toolkit.svg.fill import Segmento
from laser_toolkit.svg.geometry import Subpath


def _valor_s(potencia_pct: int, machine: MachineConfig) -> int:
    return round((potencia_pct / 100) * machine.laser_max_s)


def gcode_contorno(
    subpaths: list[Subpath],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    machine: MachineConfig,
) -> list[str]:
    """G-code que traza el contorno de cada subpath (cerrando solo los que
    `Subpath.cerrado` marca como tales)."""
    s = _valor_s(potencia_pct, machine)
    lineas: list[str] = []

    for sp in subpaths:
        if len(sp.puntos) < 2:
            continue
        puntos = list(sp.puntos)
        if sp.cerrado:
            puntos.append(puntos[0])

        x0, y0 = puntos[0]
        lineas.append(f"G0 X{x0 + x_offset_mm:.3f} Y{y0 + y_offset_mm:.3f} F{machine.travel_feed_mm_min}")
        lineas.append(f"M4 S{s}")
        for x, y in puntos[1:]:
            lineas.append(f"G1 X{x + x_offset_mm:.3f} Y{y + y_offset_mm:.3f} F{velocidad_mm_min}")
        lineas.append("M5")

    return lineas


def gcode_relleno(
    segmentos: list[Segmento],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    machine: MachineConfig,
) -> list[str]:
    """G-code que graba cada segmento horizontal de relleno como una pasada
    independiente (G0 al inicio del segmento, M4, G1 al final, M5)."""
    s = _valor_s(potencia_pct, machine)
    lineas: list[str] = []

    for (x1, y1), (x2, y2) in segmentos:
        lineas.append(f"G0 X{x1 + x_offset_mm:.3f} Y{y1 + y_offset_mm:.3f} F{machine.travel_feed_mm_min}")
        lineas.append(f"M4 S{s}")
        lineas.append(f"G1 X{x2 + x_offset_mm:.3f} Y{y2 + y_offset_mm:.3f} F{velocidad_mm_min}")
        lineas.append("M5")

    return lineas


def longitud_contorno_mm(subpaths: list[Subpath]) -> float:
    """Suma de las longitudes de todos los subpaths (cerrando los que corresponda)."""
    total = 0.0
    for sp in subpaths:
        if len(sp.puntos) < 2:
            continue
        puntos = list(sp.puntos)
        if sp.cerrado:
            puntos.append(puntos[0])
        # strict=False: por construccion `puntos[1:]` tiene un elemento menos
        # que `puntos` -- es exactamente el zip de "pares consecutivos".
        for (x1, y1), (x2, y2) in zip(puntos, puntos[1:], strict=False):
            total += math.hypot(x2 - x1, y2 - y1)
    return total


def longitud_relleno_mm(segmentos: list[Segmento]) -> float:
    return sum(math.hypot(x2 - x1, y2 - y1) for (x1, y1), (x2, y2) in segmentos)
