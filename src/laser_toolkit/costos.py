"""Costeo granular por celda (Plan Maestro, seccion 6).

Separa explicitamente los tres componentes de costo -- energia, material,
tiempo de maquina -- para que el area financiera pueda aplicar sus propias
tarifas sobre cantidades fisicas ya medidas, en vez de recibir un unico
numero mezclado que no puede auditar ni ajustar por su cuenta.

Ningun calculo de este modulo inventa una tarifa: si `TarifasConfig` no trae
un valor para un componente, ese componente se devuelve como `None`
("pendiente de tarifa"), pero la cantidad fisica medida (kWh, mm2, horas)
siempre se calcula igual.
"""

from __future__ import annotations

from laser_toolkit.config import MachineConfig
from laser_toolkit.tarifas import TarifasConfig, clave_material


def prorratear_por_tiempo(valor_total: float, pesos_tiempo_s: list[float]) -> list[float]:
    """Reparte `valor_total` (medido para una corrida completa, ej. kWh o segundos
    reales) entre celdas, proporcionalmente al tiempo estimado de cada una."""
    tiempo_total = sum(pesos_tiempo_s)
    if tiempo_total <= 0:
        raise ValueError("la suma de tiempos estimados debe ser positiva para poder prorratear")
    return [valor_total * (peso / tiempo_total) for peso in pesos_tiempo_s]


def kwh_estimado_celda(tiempo_celda_s: float, potencia_pct: int, machine: MachineConfig) -> float:
    """Estimacion de respaldo de energia cuando no hay lectura del medidor ese
    dia (Plan Maestro, seccion 6.1). Se calibra una vez comparando contra
    lecturas reales del medidor -- ver `MachineConfig.factor_utilizacion_laser`.
    """
    horas = tiempo_celda_s / 3600
    kw_nominal = machine.potencia_modulo_w / 1000
    return kw_nominal * horas * (potencia_pct / 100) * machine.factor_utilizacion_laser


def costo_energia(kwh_celda: float | None, tarifas: TarifasConfig) -> float | None:
    """`None` si falta la medicion o la tarifa electrica todavia no esta definida."""
    if kwh_celda is None or tarifas.tarifa_electrica_por_kwh is None:
        return None
    return kwh_celda * tarifas.tarifa_electrica_por_kwh


def costo_material(
    area_material_mm2: float, material: str, espesor_mm: float, tarifas: TarifasConfig
) -> float | None:
    """`0.0` si la operacion no consume material (ej. grabado). `None` si consume
    pero el precio de ese material/espesor todavia no esta en `tarifas`."""
    if area_material_mm2 <= 0:
        return 0.0
    precio_m2 = tarifas.precio_material_por_m2.get(clave_material(material, espesor_mm))
    if precio_m2 is None:
        return None
    area_m2 = area_material_mm2 / 1_000_000
    return area_m2 * precio_m2


def costo_tiempo_maquina(tiempo_celda_s: float, tarifas: TarifasConfig) -> float | None:
    """`None` si la tarifa hora-maquina todavia no esta definida."""
    if tarifas.tarifa_hora_maquina is None:
        return None
    horas = tiempo_celda_s / 3600
    return horas * tarifas.tarifa_hora_maquina


def costo_total(componentes: list[float | None]) -> float | None:
    """Suma de los tres componentes -- solo si TODOS estan disponibles.

    Deliberadamente no suma un subconjunto: mostrar un "total" que en realidad
    ignora un componente pendiente subestimaria el costo real sin avisar.
    """
    if any(c is None for c in componentes):
        return None
    total = 0.0
    for componente in componentes:
        assert componente is not None  # descartado por el `any(...)` de arriba
        total += componente
    return total
