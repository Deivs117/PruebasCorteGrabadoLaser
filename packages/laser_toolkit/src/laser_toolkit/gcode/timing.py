"""Estimacion de tiempo por celda, usada para prorratear el costo de energia
y de tiempo de maquina de una corrida completa entre sus celdas individuales
(ver Plan Maestro, seccion 5 y 6).

Estas funciones dan una aproximacion de primer orden: no modelan aceleracion ni
desaceleracion de GRBL en las esquinas. Se calibran frente a tiempos reales
reportados por LaserGRBL en la fase F5 del plan maestro.
"""

from __future__ import annotations

import math

from laser_toolkit.gcode.grid import Celda


def tiempo_corte_celda_s(celda: Celda) -> float:
    """Tiempo estimado de corte de una celda cuadrada (perimetro x numero de pasadas)."""
    perimetro_mm = 4 * celda.tamano_mm
    tiempo_una_pasada_min = perimetro_mm / celda.velocidad_mm_min
    return tiempo_una_pasada_min * 60 * celda.pasadas


def tiempo_grabado_celda_s(celda: Celda, resolucion_linea_mm: float = 0.1) -> float:
    """Tiempo estimado de grabado (relleno tipo trama/raster) de una celda cuadrada."""
    if resolucion_linea_mm <= 0:
        raise ValueError("resolucion_linea_mm debe ser positiva")
    n_lineas = math.ceil(celda.tamano_mm / resolucion_linea_mm)
    longitud_total_mm = n_lineas * celda.tamano_mm
    tiempo_min = longitud_total_mm / celda.velocidad_mm_min
    return tiempo_min * 60


def tiempo_desplazamiento_s(distancia_mm: float, feed_mm_min: float) -> float:
    """Tiempo de un desplazamiento en vacio (G0) entre dos puntos."""
    if feed_mm_min <= 0:
        raise ValueError("feed_mm_min debe ser positivo")
    return (distancia_mm / feed_mm_min) * 60
