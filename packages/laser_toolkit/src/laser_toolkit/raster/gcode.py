"""Emision de G-code de grabado raster (issue #15): barrido en zigzag
horizontal igual al de `laser_toolkit.gcode.writer.grabar_relleno` (mismo
sobre-recorrido `sobrerecorrido_mm`, mismo `M4` dinamico), pero con potencia
`S` modulada de forma CONTINUA a lo largo de cada linea (un `G1` por
muestra, no un tramo de potencia constante como en `grabar_relleno` -- ese
caso es una celda de un solo par velocidad/potencia, este es una imagen
completa) -- sin dithering en v1 (decision tomada en #3).

Rotacion (issue #16, mecanismo compartido con `laser_toolkit.svg.transform`):
la grilla de muestreo y el barrido en zigzag se generan en espacio LOCAL del
objeto (sin rotar, `(0,0)` a `(ancho_mm, alto_mm)`) -- exactamente igual que
sin rotacion. Rotar cada punto ya generado alrededor del centro de esa caja
antes de emitirlo (via `rotar_punto`) alcanza para que el resultado sea
geometricamente correcto: una rotacion es una transformacion lineal, una
recta rotada sigue siendo una recta. No hace falta (ni conviene) rotar el
algoritmo de zigzag en si para un angulo arbitrario.
"""

from __future__ import annotations

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.writer import sobrerecorrido_mm
from laser_toolkit.svg.transform import Punto, rotar_punto


def _valor_s(intensidad: float, potencia_max_pct: float, machine: MachineConfig) -> int:
    return round(intensidad * (potencia_max_pct / 100) * machine.laser_max_s)


def _muestras_fila_en_orden(fila: list[float], ancho_mm: float, ida: bool) -> list[tuple[float, float]]:
    """`(x_local_mm, intensidad)` de cada muestra de la fila, en el ORDEN real
    de recorrido -- de izquierda a derecha si `ida`, de derecha a izquierda
    si no. `x_local_mm` es el borde derecho (ida) o izquierdo (vuelta) de la
    columna que representa esa muestra: la posicion donde el `G1` que la
    aplica termina de recorrerla."""
    n = len(fila)
    ancho_columna_mm = ancho_mm / n
    if ida:
        return [((i + 1) * ancho_columna_mm, intensidad) for i, intensidad in enumerate(fila)]
    return [
        (ancho_mm - (i + 1) * ancho_columna_mm, intensidad)
        for i, intensidad in enumerate(reversed(fila))
    ]


def gcode_grabado_raster(
    matriz_intensidad: list[list[float]],
    ancho_mm: float,
    alto_mm: float,
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_max_pct: int,
    machine: MachineConfig,
    angulo_rad: float = 0.0,
) -> list[str]:
    """G-code de grabado de `matriz_intensidad` (ver `raster.canal`,
    `fila[col]` en 0.0-1.0) como barrido en zigzag horizontal, una linea por
    fila. `potencia_max_pct` es el techo de potencia (el pixel mas oscuro de
    toda la imagen llega a este valor); pixeles menos oscuros lo escalan
    proporcionalmente -- modulacion continua real, no un valor fijo por
    celda."""
    if not matriz_intensidad or not matriz_intensidad[0]:
        return []

    n_filas = len(matriz_intensidad)
    resolucion_linea_mm = alto_mm / n_filas
    overscan_mm = sobrerecorrido_mm(velocidad_mm_min, machine)
    centro: Punto = (ancho_mm / 2, alto_mm / 2)

    def posicionar(x_local: float, y_local: float) -> Punto:
        x_rot, y_rot = rotar_punto((x_local, y_local), centro, angulo_rad)
        return (x_rot + x_offset_mm, y_rot + y_offset_mm)

    lineas: list[str] = []
    ida = True
    for fila_idx, fila in enumerate(matriz_intensidad):
        # Fila 0 = borde superior de la imagen = Y mm mas alta (misma
        # convencion de Y invertido que `laser_toolkit.svg.transform`).
        y_local = alto_mm - (fila_idx + 0.5) * resolucion_linea_mm
        x_min_local, x_max_local = -overscan_mm, ancho_mm + overscan_mm
        entrada_local = 0.0 if ida else ancho_mm
        salida_local = x_max_local if ida else x_min_local
        inicio_local = x_min_local if ida else x_max_local

        x0, y0 = posicionar(inicio_local, y_local)
        lineas.append(f"G0 X{x0:.3f} Y{y0:.3f} F{machine.travel_feed_mm_min}")
        lineas.append("M4 S0")

        x_e, y_e = posicionar(entrada_local, y_local)
        lineas.append(f"G1 X{x_e:.3f} Y{y_e:.3f} F{velocidad_mm_min} S0")
        for x_local, intensidad in _muestras_fila_en_orden(fila, ancho_mm, ida):
            x_p, y_p = posicionar(x_local, y_local)
            s = _valor_s(intensidad, potencia_max_pct, machine)
            lineas.append(f"G1 X{x_p:.3f} Y{y_p:.3f} F{velocidad_mm_min} S{s}")
        x_s, y_s = posicionar(salida_local, y_local)
        lineas.append(f"G1 X{x_s:.3f} Y{y_s:.3f} F{velocidad_mm_min} S0")

        ida = not ida

    lineas.append("M5")
    return lineas
