"""Nomenclatura estandar de archivos de suite (Plan Maestro, seccion 3.4):

<material>_<espesor>mm_<operacion>_<fecha>_<lote>
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import FinalRunConfig, SuiteConfig


def slug_material(material: str) -> str:
    """Normaliza el nombre de un material para usarlo en nombres de archivo/
    rutas de Storage: espacios -> guiones, sin espacios al borde. Ej.
    "MDF Trupan" -> "MDF-Trupan". Extraido a una funcion propia (antes vivia
    duplicado inline en `nombre_base` e `id_grupo_calibracion`) para que
    `laser_toolkit.storage.rutas` (issue #25) use exactamente el mismo slug,
    sin repetir la lógica de normalización."""
    return "-".join(material.strip().split())


def nombre_base(config: SuiteConfig) -> str:
    """Nombre base (sin extension) para los archivos .gcode/.csv de una suite."""
    fecha = config.fecha or date.today().isoformat()
    return (
        f"{slug_material(config.material)}_{config.espesor_mm:g}mm_"
        f"{config.operacion.value}_{fecha}_{config.lote}"
    )


def id_grupo_calibracion(config: FinalRunConfig) -> str:
    """Identifica UNA combinacion material/espesor/operacion/velocidad/potencia,
    independiente de la fecha o la ejecucion -- la clave para agrupar varias
    ejecuciones independientes de la misma Final Run en `laser_toolkit.calibracion`.
    """
    return (
        f"{slug_material(config.material)}_{config.espesor_mm:g}mm_{config.operacion.value}_"
        f"{config.velocidad_mm_min}mmmin_{config.potencia_pct}pct"
    )


def nombre_base_final_run(config: FinalRunConfig) -> str:
    """Nombre base (sin extension) para los archivos .gcode/.csv de una ejecucion
    de Final Run."""
    fecha = config.fecha or date.today().isoformat()
    return f"FINAL_{id_grupo_calibracion(config)}_ejec{config.ejecucion}_{fecha}_{config.lote}"
