"""API de alto rango del modulo raster (issue #15): las funciones pensadas
para integrarse en otras herramientas (el lienzo de #16, un futuro endpoint
de `apps/api`) sin arrastrar detalles internos de Pillow/canal/geometria --
mismo rol que `laser_toolkit.svg.api` para SVG.
"""

from __future__ import annotations

from laser_toolkit.config import MachineConfig
from laser_toolkit.raster.canal import calcular_matriz_intensidad
from laser_toolkit.raster.config import ConfiguracionRaster
from laser_toolkit.raster.contorno import extraer_contorno
from laser_toolkit.raster.gcode import gcode_grabado_raster
from laser_toolkit.raster.imagen import decodificar_imagen
from laser_toolkit.svg.gcode import gcode_contorno
from laser_toolkit.svg.geometry import Subpath
from laser_toolkit.svg.transform import Punto, rotar_punto

__all__ = [
    "calcular_contorno_imagen",
    "convertir_imagen_a_gcode_grabado",
    "generar_gcode_corte_y_grabado",
]


def _rotar_subpaths(subpaths: list[Subpath], centro: Punto, angulo_rad: float) -> list[Subpath]:
    if angulo_rad == 0.0:
        return subpaths
    return [
        Subpath(puntos=tuple(rotar_punto(p, centro, angulo_rad) for p in sp.puntos), cerrado=sp.cerrado)
        for sp in subpaths
    ]


def calcular_contorno_imagen(datos: bytes, ancho_mm: float, alto_mm: float) -> list[Subpath]:
    """Decodifica `datos` y devuelve el contorno de corte (silueta alfa o
    rectangulo, ver `raster.contorno`) en espacio local, sin rotar ni
    posicionar -- listo para pasar a `laser_toolkit.svg.gcode.gcode_contorno`
    (rotando antes si hace falta, ver `generar_gcode_corte_y_grabado`)."""
    imagen = decodificar_imagen(datos)
    return extraer_contorno(imagen, ancho_mm, alto_mm)


def convertir_imagen_a_gcode_grabado(
    datos: bytes,
    ancho_mm: float,
    alto_mm: float,
    velocidad_mm_min: int,
    potencia_max_pct: int,
    machine: MachineConfig,
    config: ConfiguracionRaster | None = None,
    x_offset_mm: float = 0.0,
    y_offset_mm: float = 0.0,
    angulo_rad: float = 0.0,
) -> list[str]:
    """Decodifica `datos` y genera el G-code de grabado por intensidad de
    pixel (barrido en zigzag, potencia continua) -- la funcion atomica de
    conversion imagen -> G-code, analoga a
    `laser_toolkit.svg.api.convertir_svg_a_gcode`."""
    imagen = decodificar_imagen(datos)
    matriz = calcular_matriz_intensidad(imagen, ancho_mm, alto_mm, config or ConfiguracionRaster())
    return gcode_grabado_raster(
        matriz,
        ancho_mm,
        alto_mm,
        x_offset_mm,
        y_offset_mm,
        velocidad_mm_min,
        potencia_max_pct,
        machine,
        angulo_rad=angulo_rad,
    )


def generar_gcode_corte_y_grabado(
    datos: bytes,
    ancho_mm: float,
    alto_mm: float,
    machine: MachineConfig,
    *,
    grabado_velocidad_mm_min: int | None = None,
    grabado_potencia_max_pct: int | None = None,
    grabado_config: ConfiguracionRaster | None = None,
    corte_velocidad_mm_min: int | None = None,
    corte_potencia_pct: int | None = None,
    x_offset_mm: float = 0.0,
    y_offset_mm: float = 0.0,
    angulo_rad: float = 0.0,
) -> list[str]:
    """Combina grabado por intensidad + corte de contorno para un objeto que
    hace ambas operaciones (ver el modo Producción de #17: cada operacion
    tiene su propio par velocidad/potencia). Cualquiera de las dos
    operaciones se omite pasando sus parametros de velocidad/potencia en
    `None` -- nunca corre "a medias" con un valor inventado."""
    gcode: list[str] = []
    imagen = decodificar_imagen(datos)

    if grabado_velocidad_mm_min is not None and grabado_potencia_max_pct is not None:
        config = grabado_config or ConfiguracionRaster()
        matriz = calcular_matriz_intensidad(imagen, ancho_mm, alto_mm, config)
        gcode += gcode_grabado_raster(
            matriz,
            ancho_mm,
            alto_mm,
            x_offset_mm,
            y_offset_mm,
            grabado_velocidad_mm_min,
            grabado_potencia_max_pct,
            machine,
            angulo_rad=angulo_rad,
        )

    if corte_velocidad_mm_min is not None and corte_potencia_pct is not None:
        contorno_local = extraer_contorno(imagen, ancho_mm, alto_mm)
        centro = (ancho_mm / 2, alto_mm / 2)
        contorno_rotado = _rotar_subpaths(contorno_local, centro, angulo_rad)
        gcode += gcode_contorno(
            contorno_rotado,
            x_offset_mm,
            y_offset_mm,
            corte_velocidad_mm_min,
            corte_potencia_pct,
            machine,
        )

    return gcode
