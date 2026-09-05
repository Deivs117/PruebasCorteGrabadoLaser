"""Agregacion estadistica de multiples ejecuciones independientes de una misma
Final Run (Plan Maestro, seccion 8): convierte varias lecturas de medidor de
corridas fisicas separadas en un valor de energia y tiempo por unidad ya
calibrado, con su desviacion estandar y coeficiente de variacion -- el
numero que se documenta en la futura Ficha de Parametro Estandar (F6).

Este modulo NO calcula costos en $ (eso es `laser_toolkit.costos`): solo
resume cantidades fisicas medidas entre ejecuciones.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass


@dataclass(frozen=True)
class ResumenCalibracion:
    grupo_calibracion_id: str
    n_ejecuciones: int
    kwh_por_unidad_medio: float
    kwh_por_unidad_desv_std: float | None
    kwh_por_unidad_cv_pct: float | None
    tiempo_por_unidad_s_medio: float
    tiempo_por_unidad_s_desv_std: float | None
    tiempo_por_unidad_s_cv_pct: float | None
    calibrado: bool


def _cv_pct(media: float, desv: float | None) -> float | None:
    if desv is None or media == 0:
        return None
    return (desv / media) * 100


def resumir_calibracion(filas: list[dict], minimo_ejecuciones: int = 3) -> ResumenCalibracion:
    """Resume una o mas ejecuciones independientes de la MISMA Final Run.

    `filas` son las filas de uno o mas registros ya completados (con
    `kwh_corrida_medido` y `tiempo_real_corrida_s` llenos -- esta funcion no
    tiene respaldo de estimacion: calibrar exige mediciones reales). Todas
    deben compartir `grupo_calibracion_id`; se agrupan internamente por
    `corrida_id` (una corrida = una ejecucion).
    """
    if not filas:
        raise ValueError("no hay filas para resumir")

    grupos_calibracion = {fila["grupo_calibracion_id"] for fila in filas}
    if len(grupos_calibracion) != 1:
        raise ValueError(
            f"se esperaba un unico grupo_calibracion_id, se encontraron {sorted(grupos_calibracion)}"
        )
    grupo = grupos_calibracion.pop()
    if not grupo:
        raise ValueError("las filas no tienen grupo_calibracion_id -- ¿son de una Final Run?")

    por_ejecucion: dict[str, list[dict]] = {}
    for fila in filas:
        por_ejecucion.setdefault(fila["corrida_id"], []).append(fila)

    kwh_por_unidad_por_ejecucion: list[float] = []
    tiempo_por_unidad_por_ejecucion: list[float] = []
    for corrida_id, grupo_filas in por_ejecucion.items():
        n_replicas = len(grupo_filas)
        kwh_texto = str(grupo_filas[0].get("kwh_corrida_medido", "")).strip()
        tiempo_texto = str(grupo_filas[0].get("tiempo_real_corrida_s", "")).strip()
        if not kwh_texto or not tiempo_texto:
            raise ValueError(
                f"corrida '{corrida_id}': falta kwh_corrida_medido o tiempo_real_corrida_s -- "
                "una Final Run necesita la medicion real, no tiene respaldo de estimacion."
            )
        kwh_por_unidad_por_ejecucion.append(float(kwh_texto) / n_replicas)
        tiempo_por_unidad_por_ejecucion.append(float(tiempo_texto) / n_replicas)

    n_ejecuciones = len(kwh_por_unidad_por_ejecucion)
    kwh_media = statistics.mean(kwh_por_unidad_por_ejecucion)
    tiempo_media = statistics.mean(tiempo_por_unidad_por_ejecucion)
    kwh_std = statistics.stdev(kwh_por_unidad_por_ejecucion) if n_ejecuciones > 1 else None
    tiempo_std = statistics.stdev(tiempo_por_unidad_por_ejecucion) if n_ejecuciones > 1 else None

    return ResumenCalibracion(
        grupo_calibracion_id=grupo,
        n_ejecuciones=n_ejecuciones,
        kwh_por_unidad_medio=kwh_media,
        kwh_por_unidad_desv_std=kwh_std,
        kwh_por_unidad_cv_pct=_cv_pct(kwh_media, kwh_std),
        tiempo_por_unidad_s_medio=tiempo_media,
        tiempo_por_unidad_s_desv_std=tiempo_std,
        tiempo_por_unidad_s_cv_pct=_cv_pct(tiempo_media, tiempo_std),
        calibrado=n_ejecuciones >= minimo_ejecuciones,
    )
