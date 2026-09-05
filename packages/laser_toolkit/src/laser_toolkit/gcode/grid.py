"""Construccion de la grilla de celdas de una suite de prueba.

Cada celda es una combinacion unica de velocidad x potencia. La grilla se recorre
en orden serpenteado (boustrophedon) para minimizar los desplazamientos en vacio
entre celdas consecutivas.
"""

from __future__ import annotations

from dataclasses import dataclass

from laser_toolkit.config import SuiteConfig


@dataclass(frozen=True)
class Celda:
    """Una celda individual de la grilla: filas = potencias, columnas = velocidades."""

    id: str
    velocidad_mm_min: int
    potencia_pct: int
    pasadas: int
    x_mm: float
    y_mm: float
    tamano_mm: float


def construir_grilla(config: SuiteConfig, origen_x_mm: float = 0.0) -> list[Celda]:
    """Arma la lista de celdas de la suite a partir de la configuracion.

    El identificador de cada celda sigue el orden de recorrido de la maquina
    (serpenteado), pero su posicion (x, y) siempre corresponde a su lugar real
    en la grilla (fila = indice de potencia, columna = indice de velocidad).

    `origen_x_mm` desplaza toda la grilla en X (por defecto 0, sin desplazar).
    Lo usa `suites/engrave.py` para dejarle al sobre-recorrido (overscan) del
    relleno tipo trama espacio hacia la izquierda de la columna 0 sin caer en
    coordenadas negativas -- ver `laser_toolkit.gcode.writer.grabar_relleno`.
    """
    celdas: list[Celda] = []
    paso = config.tamano_celda_mm + config.espaciado_mm
    n_columnas = len(config.velocidades_mm_min)
    contador = 1

    for fila, potencia in enumerate(config.potencias_pct):
        orden_columnas = range(n_columnas) if fila % 2 == 0 else range(n_columnas - 1, -1, -1)
        for columna in orden_columnas:
            velocidad = config.velocidades_mm_min[columna]
            celdas.append(
                Celda(
                    id=f"{config.id_prefijo}-{contador:03d}",
                    velocidad_mm_min=velocidad,
                    potencia_pct=potencia,
                    pasadas=config.pasadas,
                    x_mm=origen_x_mm + columna * paso,
                    y_mm=fila * paso,
                    tamano_mm=config.tamano_celda_mm,
                )
            )
            contador += 1
    return celdas
