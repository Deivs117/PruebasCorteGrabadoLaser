"""API de alto nivel del modulo SVG: las funciones pensadas para integrarse
en otras herramientas (una suite de prueba, un futuro pipeline de
automatizacion, un script de nesting, etc.) sin arrastrar detalles internos
de parsing/geometria.

`cargar_subpaths_svg` es la pieza puramente geometrica (sin G-code): parsea
un SVG y devuelve sus formas ya escaladas a milimetros, listas para
posicionar. `convertir_svg_a_gcode` es la funcion atomica de conversion
completa SVG -> G-code, usable de forma independiente al resto del toolkit
(ver `laser_toolkit.cli:svg_to_gcode` para el uso como comando suelto).
"""

from __future__ import annotations

from pathlib import Path

from laser_toolkit.config import MachineConfig
from laser_toolkit.svg.document import parsear_svg
from laser_toolkit.svg.fill import generar_segmentos_relleno
from laser_toolkit.svg.gcode import gcode_contorno, gcode_relleno, longitud_contorno_mm, longitud_relleno_mm
from laser_toolkit.svg.geometry import Subpath
from laser_toolkit.svg.modo import RESOLUCION_RELLENO_MM_POR_DEFECTO, ModoGrabadoSvg
from laser_toolkit.svg.transform import aplicar_transformacion, calcular_transformacion

__all__ = [
    "RESOLUCION_RELLENO_MM_POR_DEFECTO",
    "ModoGrabadoSvg",
    "cargar_subpaths_svg",
    "convertir_svg_a_gcode",
    "tiempo_estimado_svg_s",
]


def cargar_subpaths_svg(ruta_svg: str | Path, ancho_mm: float, alto_mm: float) -> list[Subpath]:
    """Parsea `ruta_svg` y devuelve sus subpaths escalados a milimetros, dentro
    de una caja `ancho_mm x alto_mm` (proporcion preservada, centrado).

    Punto de extension atomico: cualquier integracion futura que necesite la
    geometria sin generar G-code (nesting, previsualizacion, exportar a otro
    formato) parte de aqui.
    """
    subpaths_svg, viewbox = parsear_svg(ruta_svg)
    transformacion = calcular_transformacion(viewbox, ancho_mm, alto_mm)
    return aplicar_transformacion(subpaths_svg, transformacion)


def convertir_svg_a_gcode(
    ruta_svg: str | Path,
    ancho_mm: float,
    alto_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    machine: MachineConfig,
    modo: ModoGrabadoSvg = ModoGrabadoSvg.CONTORNO_Y_RELLENO,
    resolucion_relleno_mm: float = RESOLUCION_RELLENO_MM_POR_DEFECTO,
    x_offset_mm: float = 0.0,
    y_offset_mm: float = 0.0,
) -> list[str]:
    """Convierte un SVG en lineas de G-code, lista para escribir a un archivo
    `.gcode` o insertar dentro de una suite mas grande (ver
    `laser_toolkit.suites.engrave`)."""
    subpaths = cargar_subpaths_svg(ruta_svg, ancho_mm, alto_mm)
    return _gcode_desde_subpaths(
        subpaths,
        x_offset_mm,
        y_offset_mm,
        velocidad_mm_min,
        potencia_pct,
        machine,
        modo,
        resolucion_relleno_mm,
    )


def _gcode_desde_subpaths(
    subpaths: list[Subpath],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    machine: MachineConfig,
    modo: ModoGrabadoSvg,
    resolucion_relleno_mm: float,
) -> list[str]:
    gcode: list[str] = []
    if modo in (ModoGrabadoSvg.CONTORNO, ModoGrabadoSvg.CONTORNO_Y_RELLENO):
        gcode += gcode_contorno(subpaths, x_offset_mm, y_offset_mm, velocidad_mm_min, potencia_pct, machine)
    if modo in (ModoGrabadoSvg.RELLENO, ModoGrabadoSvg.CONTORNO_Y_RELLENO):
        segmentos = generar_segmentos_relleno(subpaths, resolucion_relleno_mm)
        gcode += gcode_relleno(segmentos, x_offset_mm, y_offset_mm, velocidad_mm_min, potencia_pct, machine)
    return gcode


def tiempo_estimado_svg_s(
    subpaths: list[Subpath],
    velocidad_mm_min: int,
    modo: ModoGrabadoSvg = ModoGrabadoSvg.CONTORNO_Y_RELLENO,
    resolucion_relleno_mm: float = RESOLUCION_RELLENO_MM_POR_DEFECTO,
) -> float:
    """Tiempo estimado (segundos) de grabar `subpaths` a `velocidad_mm_min`,
    sumando la longitud de contorno y/o de relleno segun `modo` (analogo a
    `laser_toolkit.gcode.timing` pero para geometria vectorial arbitraria)."""
    longitud_mm = 0.0
    if modo in (ModoGrabadoSvg.CONTORNO, ModoGrabadoSvg.CONTORNO_Y_RELLENO):
        longitud_mm += longitud_contorno_mm(subpaths)
    if modo in (ModoGrabadoSvg.RELLENO, ModoGrabadoSvg.CONTORNO_Y_RELLENO):
        segmentos = generar_segmentos_relleno(subpaths, resolucion_relleno_mm)
        longitud_mm += longitud_relleno_mm(segmentos)
    return (longitud_mm / velocidad_mm_min) * 60
