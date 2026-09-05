import pytest

from laser_toolkit.config import MachineConfig
from laser_toolkit.io.registro import COLUMNAS_MANUALES, calcular_costos_registro, preparar_registro
from laser_toolkit.tarifas import TarifasConfig


def _fila_corte(**overrides: object) -> dict:
    base: dict = {
        "corrida_id": "MDF-Trupan_3mm_corte_2026-08-28_L01",
        "id_prueba": "C-001",
        "material": "MDF Trupan",
        "espesor_mm": "3.0",
        "operacion": "corte",
        "potencia_pct": "100",
        "area_material_mm2": "225.0",
        "tiempo_estimado_celda_s": "15.0",
    }
    base.update(overrides)
    return base


def test_preparar_registro_agrega_columnas_vacias():
    filas = preparar_registro([_fila_corte()])
    assert all(columna in filas[0] for columna in COLUMNAS_MANUALES)
    assert filas[0]["notas"] == ""
    # no toca las columnas originales
    assert filas[0]["id_prueba"] == "C-001"


def test_calcular_costos_sin_mediciones_usa_respaldo_estimado():
    filas = preparar_registro([_fila_corte()])
    tarifas = TarifasConfig()
    machine = MachineConfig()

    resultado = calcular_costos_registro(filas, tarifas, machine)

    assert len(resultado) == 1
    fila = resultado[0]
    assert fila["kwh_celda"] > 0  # vino del respaldo estimado, no de una medicion
    assert fila["costo_energia_celda"] is None  # sin tarifa electrica definida
    assert fila["costo_total_celda"] is None


def test_calcular_costos_con_mediciones_y_tarifas_completas():
    fila_1 = _fila_corte(id_prueba="C-001", tiempo_estimado_celda_s="10.0", kwh_corrida_medido="0.02")
    fila_2 = _fila_corte(id_prueba="C-002", tiempo_estimado_celda_s="30.0", kwh_corrida_medido="0.02")
    for fila in (fila_1, fila_2):
        fila["tiempo_real_corrida_s"] = "4000"

    tarifas = TarifasConfig(
        tarifa_electrica_por_kwh=800,
        tarifa_hora_maquina=5000,
        precio_material_por_m2={"MDF Trupan_3mm": 30000},
    )

    resultado = calcular_costos_registro([fila_1, fila_2], tarifas, MachineConfig())

    # prorrateo por peso de tiempo estimado: 10/(10+30) y 30/(10+30)
    assert resultado[0]["kwh_celda"] == pytest.approx(0.005)
    assert resultado[1]["kwh_celda"] == pytest.approx(0.015)
    assert resultado[0]["tiempo_maquina_celda_s"] == pytest.approx(1000.0)
    assert resultado[1]["tiempo_maquina_celda_s"] == pytest.approx(3000.0)
    # con las tres tarifas completas, costo_total_celda ya no es None
    assert resultado[0]["costo_total_celda"] is not None
    assert resultado[0]["costo_total_celda"] == pytest.approx(
        resultado[0]["costo_energia_celda"]
        + resultado[0]["costo_material_celda"]
        + resultado[0]["costo_tiempo_maquina_celda"]
    )


def test_calcular_costos_valores_inconsistentes_en_la_corrida_falla():
    fila_1 = _fila_corte(id_prueba="C-001", kwh_corrida_medido="0.02")
    fila_2 = _fila_corte(id_prueba="C-002", kwh_corrida_medido="0.03")

    with pytest.raises(ValueError, match="valores distintos"):
        calcular_costos_registro([fila_1, fila_2], TarifasConfig(), MachineConfig())


def test_calcular_costos_grabado_no_cobra_material():
    fila = _fila_corte(operacion="grabado", area_material_mm2="0.0")
    tarifas = TarifasConfig(tarifa_electrica_por_kwh=800, tarifa_hora_maquina=5000)

    resultado = calcular_costos_registro(preparar_registro([fila]), tarifas, MachineConfig())

    assert resultado[0]["costo_material_celda"] == 0.0
