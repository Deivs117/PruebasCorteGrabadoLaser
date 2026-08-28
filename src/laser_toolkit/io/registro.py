"""Hoja de Registro (Plan Maestro, seccion 5): agrega al csv generado por una
suite las columnas que se completan a mano tras correr la corrida en la
maquina, y luego calcula el costeo granular a partir de esas mediciones + las
tarifas de negocio (`laser_toolkit.tarifas`).
"""

from __future__ import annotations

from laser_toolkit.config import MachineConfig
from laser_toolkit.costos import (
    costo_energia,
    costo_material,
    costo_tiempo_maquina,
    costo_total,
    kwh_estimado_celda,
    prorratear_por_tiempo,
)
from laser_toolkit.tarifas import TarifasConfig

# Columnas que se completan a mano (o se miden) DESPUES de correr la corrida en
# la maquina -- ver Plan Maestro, seccion 4 (Protocolo de Ejecucion).
#
# `kwh_corrida_medido` y `tiempo_real_corrida_s` son mediciones de LA CORRIDA
# COMPLETA (no de una celda individual): se anota el mismo valor en todas las
# filas que comparten `corrida_id`. `calcular_costos_registro` valida que no
# haya valores distintos dentro de una misma corrida.
COLUMNAS_MANUALES = [
    "corte_pasante",
    "calidad_borde_1a5",
    "carbonizacion_1a5",
    "kwh_corrida_medido",
    "tiempo_real_corrida_s",
    "foto",
    "notas",
]

# Columnas que agrega el costeo: los tres componentes siempre por separado,
# mas un total de conveniencia solo cuando los tres estan disponibles.
COLUMNAS_COSTEO = [
    "kwh_celda",
    "costo_energia_celda",
    "costo_material_celda",
    "tiempo_maquina_celda_s",
    "costo_tiempo_maquina_celda",
    "costo_total_celda",
]


def preparar_registro(filas_generadas: list[dict]) -> list[dict]:
    """Agrega las columnas manuales (vacias) a las filas que ya produjo una suite."""
    return [{**fila, **dict.fromkeys(COLUMNAS_MANUALES, "")} for fila in filas_generadas]


def _a_float_o_none(valor: object) -> float | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    return float(texto) if texto else None


def _redondear_o_none(valor: float | None, decimales: int = 4) -> float | None:
    return None if valor is None else round(valor, decimales)


def _valor_unico_de_grupo(grupo: list[dict], columna: str, corrida_id: str) -> float | None:
    """Extrae el valor de `columna` de un grupo de filas de la misma corrida,
    validando que no haya valores distintos entre si (deberian ser identicos,
    por ser una medicion de la corrida completa repetida en cada fila)."""
    valores = {valor for fila in grupo if (valor := _a_float_o_none(fila.get(columna))) is not None}
    if len(valores) > 1:
        raise ValueError(
            f"corrida '{corrida_id}': la columna '{columna}' tiene valores distintos entre filas "
            f"({sorted(valores)}); debe ser el mismo en todas las filas de la corrida."
        )
    return next(iter(valores), None)


def calcular_costos_registro(
    filas: list[dict], tarifas: TarifasConfig, machine: MachineConfig | None = None
) -> list[dict]:
    """Calcula el costeo granular de cada fila de un registro ya completado.

    Agrupa por `corrida_id` para prorratear `kwh_corrida_medido` y
    `tiempo_real_corrida_s` entre celdas segun su peso de tiempo estimado
    (`tiempo_estimado_celda_s`). Si esas mediciones no estan disponibles para
    una corrida (no se pudo leer el medidor ese dia), cae al estimado de
    respaldo de energia (Plan Maestro, seccion 6.1) y usa el tiempo estimado
    teorico como tiempo de maquina.
    """
    machine = machine or MachineConfig()

    filas_por_corrida: dict[str, list[dict]] = {}
    for fila in filas:
        filas_por_corrida.setdefault(fila["corrida_id"], []).append(fila)

    resultado: list[dict] = []
    for corrida_id, grupo in filas_por_corrida.items():
        kwh_corrida = _valor_unico_de_grupo(grupo, "kwh_corrida_medido", corrida_id)
        tiempo_real_corrida = _valor_unico_de_grupo(grupo, "tiempo_real_corrida_s", corrida_id)
        pesos = [float(fila["tiempo_estimado_celda_s"]) for fila in grupo]

        if kwh_corrida is not None:
            kwh_por_celda = prorratear_por_tiempo(kwh_corrida, pesos)
        else:
            kwh_por_celda = [
                kwh_estimado_celda(peso, int(fila["potencia_pct"]), machine)
                for peso, fila in zip(pesos, grupo, strict=True)
            ]

        tiempo_maquina_por_celda = (
            prorratear_por_tiempo(tiempo_real_corrida, pesos) if tiempo_real_corrida is not None else pesos
        )

        for fila, kwh_celda, tiempo_maquina_s in zip(
            grupo, kwh_por_celda, tiempo_maquina_por_celda, strict=True
        ):
            # Se redondea ANTES de sumar el total, para que costo_total_celda
            # coincida exactamente con la suma de las tres columnas visibles
            # (evita que el area financiera vea "descuadres" de centavos).
            c_energia = _redondear_o_none(costo_energia(kwh_celda, tarifas))
            c_material = _redondear_o_none(
                costo_material(
                    float(fila["area_material_mm2"]), fila["material"], float(fila["espesor_mm"]), tarifas
                )
            )
            c_tiempo = _redondear_o_none(costo_tiempo_maquina(tiempo_maquina_s, tarifas))
            resultado.append(
                {
                    **fila,
                    "kwh_celda": round(kwh_celda, 6),
                    "costo_energia_celda": c_energia,
                    "costo_material_celda": c_material,
                    "tiempo_maquina_celda_s": round(tiempo_maquina_s, 2),
                    "costo_tiempo_maquina_celda": c_tiempo,
                    "costo_total_celda": costo_total([c_energia, c_material, c_tiempo]),
                }
            )
    return resultado
