"""Emision de G-code para el contorno y el relleno de un conjunto de subpaths
ya escalados a milimetros (ver `laser_toolkit.svg.transform`), reutilizando
las mismas convenciones de `laser_toolkit.gcode.writer` (M4 dinamico, valor S
segun `MachineConfig.laser_max_s`).
"""

from __future__ import annotations

import math

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.writer import sobrerecorrido_mm
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
    pasadas: int = 1,
) -> list[str]:
    """G-code que traza el contorno de cada subpath (cerrando solo los que
    `Subpath.cerrado` marca como tales), repitiendo cada uno `pasadas` veces
    (issue: el corte del editor no soportaba varias pasadas, a diferencia del
    corte de Suites/`cortar_cuadrado` -- MDF de 3mm real necesita 2 pasadas a
    100% de potencia para cortar de punta a punta, una sola no alcanza).
    Cada subpath se recorre por completo `pasadas` veces antes de pasar al
    siguiente, para no ir y volver de un lado al otro del dibujo entre
    pasadas."""
    if pasadas < 1:
        raise ValueError("pasadas debe ser al menos 1")

    s = _valor_s(potencia_pct, machine)
    lineas: list[str] = []

    for sp in subpaths:
        if len(sp.puntos) < 2:
            continue
        puntos = list(sp.puntos)
        if sp.cerrado:
            puntos.append(puntos[0])

        x0, y0 = puntos[0]
        for pasada in range(pasadas):
            lineas.append(f"G0 X{x0 + x_offset_mm:.3f} Y{y0 + y_offset_mm:.3f} F{machine.travel_feed_mm_min}")
            lineas.append(f"M4 S{s}")
            for x, y in puntos[1:]:
                lineas.append(f"G1 X{x + x_offset_mm:.3f} Y{y + y_offset_mm:.3f} F{velocidad_mm_min}")
            lineas.append("M5")
            if pasada < pasadas - 1:
                lineas.append(
                    f"; pasada {pasada + 2}/{pasadas}: aplicar z_step_mm de la configuracion "
                    "(ajuste manual de Z o G-code M-code segun el firmware)"
                )

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
    independiente, con sobre-recorrido (`sobrerecorrido_mm`, laser apagado)
    a cada lado del segmento real -- mismo mecanismo, y misma razon, que
    `laser_toolkit.gcode.writer.grabar_relleno`/`laser_toolkit.raster.gcode.
    gcode_grabado_raster`: sin esto, la maquina arranca y frena en seco
    justo en el borde real del trazo, y el borde queda sobre-quemado
    (mas tiempo cerca de velocidad cero justo donde el laser esta prendido).
    Cada `Segmento` de `generar_segmentos_relleno` ya viene horizontal
    (misma Y en ambos puntos, `x1 <= x2`), asi que extender el
    sobre-recorrido es una simple resta/suma en X."""
    s = _valor_s(potencia_pct, machine)
    overscan_mm = sobrerecorrido_mm(velocidad_mm_min, machine)
    lineas: list[str] = []

    for (x1, y), (x2, _y2) in segmentos:
        x_entrada = x1 - overscan_mm + x_offset_mm
        x_salida = x2 + overscan_mm + x_offset_mm
        y_abs = y + y_offset_mm
        lineas.append(f"G0 X{x_entrada:.3f} Y{y_abs:.3f} F{machine.travel_feed_mm_min}")
        lineas.append("M4 S0")
        lineas.append(f"G1 X{x1 + x_offset_mm:.3f} Y{y_abs:.3f} F{velocidad_mm_min} S0")
        lineas.append(f"G1 X{x2 + x_offset_mm:.3f} Y{y_abs:.3f} F{velocidad_mm_min} S{s}")
        lineas.append(f"G1 X{x_salida:.3f} Y{y_abs:.3f} F{velocidad_mm_min} S0")
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
