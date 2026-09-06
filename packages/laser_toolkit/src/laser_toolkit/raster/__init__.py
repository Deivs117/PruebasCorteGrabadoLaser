"""Imagen raster -> G-code de grabado por intensidad de pixel (issue #15,
sub-tarea de #3). Usa Pillow -- capacidad nueva, no existia procesamiento de
imagenes en el backend antes de este modulo.

Ver `laser_toolkit.raster.api` para las funciones de alto nivel pensadas
para integrarse en otras herramientas (mismo rol que `laser_toolkit.svg.api`
para SVG).
"""

from __future__ import annotations

from laser_toolkit.raster.api import (
    calcular_contorno_imagen,
    convertir_imagen_a_gcode_grabado,
    generar_gcode_corte_y_grabado,
)
from laser_toolkit.raster.config import (
    RESOLUCION_RASTER_MM_POR_DEFECTO,
    CanalRaster,
    ConfiguracionRaster,
)

__all__ = [
    "RESOLUCION_RASTER_MM_POR_DEFECTO",
    "CanalRaster",
    "ConfiguracionRaster",
    "calcular_contorno_imagen",
    "convertir_imagen_a_gcode_grabado",
    "generar_gcode_corte_y_grabado",
]
