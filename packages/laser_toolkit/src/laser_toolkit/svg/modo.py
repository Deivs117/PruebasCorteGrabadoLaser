"""Modo de grabado vectorial de un SVG.

Vive en su propio modulo sin dependencias (ni siquiera de `laser_toolkit.config`)
a proposito: tanto `laser_toolkit.config` (que necesita el tipo para el campo
`modo_grabado_svg` de `SuiteConfig`) como `laser_toolkit.svg.api` lo importan,
y `svg.api` ya depende de `config.MachineConfig` -- si este enum viviera en
`svg.api`, `config.py` no podria importarlo sin crear un ciclo.
"""

from __future__ import annotations

from enum import Enum


class ModoGrabadoSvg(str, Enum):
    CONTORNO = "contorno"
    RELLENO = "relleno"
    CONTORNO_Y_RELLENO = "contorno_y_relleno"


RESOLUCION_RELLENO_MM_POR_DEFECTO = 0.3
