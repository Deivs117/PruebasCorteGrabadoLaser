"""Nomenclatura estandar de archivos de suite (Plan Maestro, seccion 3.4):

<material>_<espesor>mm_<operacion>_<fecha>_<lote>
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import SuiteConfig


def nombre_base(config: SuiteConfig) -> str:
    """Nombre base (sin extension) para los archivos .gcode/.csv de una suite."""
    material_slug = "-".join(config.material.strip().split())
    fecha = config.fecha or date.today().isoformat()
    return f"{material_slug}_{config.espesor_mm:g}mm_{config.operacion.value}_{fecha}_{config.lote}"
