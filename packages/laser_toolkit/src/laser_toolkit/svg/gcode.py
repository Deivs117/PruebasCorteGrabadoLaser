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

    El overscan de `sobrerecorrido_mm` esta pensado para celdas/trazos largos
    (una Suite, una foto completa) -- aplicado tal cual a un relleno
    vectorial con trazos finos (letras, patas de un insecto, etc.) resulta
    contraproducente: un trazo real de 2mm con 5mm de overscan a cada lado
    multiplica por 6 la distancia de ese segmento, y como la maquina nunca
    llega a velocidad de crucero en un tramo tan corto (perfil triangular,
    no trapezoidal), ese tiempo extra es casi puro acelerar/frenar sin
    aportar nada al grabado real -- medido en una pieza real, el overscan
    llego a ser el 56% del tiempo total de grabado. Por eso se lo TOPA al
    largo real del propio trazo (`min(overscan, longitud_real)`): un trazo
    largo sigue teniendo el overscan completo (protege el borde igual que
    antes), uno corto recibe un overscan proporcional a su propio tamaño en
    vez de una constante fija pensada para trazos mucho mas grandes.

    Cada `Segmento` de `generar_segmentos_relleno` viene horizontal (misma Y
    en ambos puntos), pero el sentido de recorrido (cual punto es la entrada
    y cual la salida) puede ir en cualquier direccion -- el zigzag de filas
    alternadas invierte el orden en las filas de "vuelta" para que la
    maquina no viaje en vacio de vuelta al extremo izquierdo en cada fila.
    Por eso acá no se asume `x1 <= x2`: la entrada/salida del overscan se
    extienden en la direccion real de avance de CADA segmento, tomada tal
    cual viene."""
    s = _valor_s(potencia_pct, machine)
    overscan_maximo_mm = sobrerecorrido_mm(velocidad_mm_min, machine)
    lineas: list[str] = []

    for (x1, y), (x2, _y2) in segmentos:
        direccion = 1.0 if x2 >= x1 else -1.0
        overscan_mm = min(overscan_maximo_mm, abs(x2 - x1))
        x_entrada = x1 - direccion * overscan_mm + x_offset_mm
        x_salida = x2 + direccion * overscan_mm + x_offset_mm
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
