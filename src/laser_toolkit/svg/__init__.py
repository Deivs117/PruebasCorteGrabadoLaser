"""Conversion de SVG a G-code: parser propio (sin dependencias pesadas),
geometria (parser, curvas, transformacion, relleno) desacoplada de la
emision de G-code.

Deliberadamente vacio de imports: `laser_toolkit.config` necesita importar
`laser_toolkit.svg.modo` (el enum `ModoGrabadoSvg`) sin arrastrar
`laser_toolkit.svg.api`, que a su vez depende de `config.MachineConfig` --
si este archivo reexportara simbolos de `svg.api` aqui, cualquier import de
un submodulo de `svg` (incluido `svg.modo`) ejecutaria este `__init__.py`
primero y crearia un ciclo de import.

Uso tipico:

    from laser_toolkit.svg.api import convertir_svg_a_gcode, ModoGrabadoSvg

    gcode = convertir_svg_a_gcode(
        "assets/svg/logo-empresa.svg",
        ancho_mm=30, alto_mm=30,
        velocidad_mm_min=1200, potencia_pct=25,
        machine=MachineConfig(),
    )
"""

from __future__ import annotations
