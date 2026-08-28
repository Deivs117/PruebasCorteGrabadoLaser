"""Nomenclatura estandar de archivos de suite (Plan Maestro, seccion 3.4):

<material>_<espesor>mm_<operacion>_<fecha>_<lote>
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import FinalRunConfig, SuiteConfig


def nombre_base(config: SuiteConfig) -> str:
    """Nombre base (sin extension) para los archivos .gcode/.csv de una suite."""
    material_slug = "-".join(config.material.strip().split())
    fecha = config.fecha or date.today().isoformat()
    return f"{material_slug}_{config.espesor_mm:g}mm_{config.operacion.value}_{fecha}_{config.lote}"


def id_grupo_calibracion(config: FinalRunConfig) -> str:
    """Identifica UNA combinacion material/espesor/operacion/velocidad/potencia,
    independiente de la fecha o la ejecucion -- la clave para agrupar varias
    ejecuciones independientes de la misma Final Run en `laser_toolkit.calibracion`.
    """
    material_slug = "-".join(config.material.strip().split())
    return (
        f"{material_slug}_{config.espesor_mm:g}mm_{config.operacion.value}_"
        f"{config.velocidad_mm_min}mmmin_{config.potencia_pct}pct"
    )


def nombre_base_final_run(config: FinalRunConfig) -> str:
    """Nombre base (sin extension) para los archivos .gcode/.csv de una ejecucion
    de Final Run."""
    fecha = config.fecha or date.today().isoformat()
    return f"FINAL_{id_grupo_calibracion(config)}_ejec{config.ejecucion}_{fecha}_{config.lote}"
