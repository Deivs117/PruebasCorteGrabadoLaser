import pytest

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


def test_prorratear_por_tiempo_reparte_proporcionalmente():
    resultado = prorratear_por_tiempo(10.0, [10.0, 30.0])
    assert resultado == pytest.approx([2.5, 7.5])


def test_prorratear_por_tiempo_total_cero_falla():
    with pytest.raises(ValueError):
        prorratear_por_tiempo(10.0, [0.0, 0.0])


def test_kwh_estimado_celda_escala_con_potencia_y_factor():
    machine = MachineConfig(potencia_modulo_w=10.0, factor_utilizacion_laser=1.0)
    kwh_100pct = kwh_estimado_celda(tiempo_celda_s=3600, potencia_pct=100, machine=machine)
    kwh_50pct = kwh_estimado_celda(tiempo_celda_s=3600, potencia_pct=50, machine=machine)
    assert kwh_100pct == pytest.approx(0.010)  # 10W * 1h = 0.01 kWh
    assert kwh_50pct == pytest.approx(kwh_100pct / 2)


def test_costo_energia_pendiente_si_falta_tarifa():
    tarifas = TarifasConfig()
    assert costo_energia(0.01, tarifas) is None


def test_costo_energia_calculado_si_hay_tarifa():
    tarifas = TarifasConfig(tarifa_electrica_por_kwh=800)
    assert costo_energia(0.01, tarifas) == pytest.approx(8.0)


def test_costo_material_cero_si_no_consume_material():
    tarifas = TarifasConfig()
    assert costo_material(0.0, "MDF Trupan", 3.0, tarifas) == 0.0


def test_costo_material_pendiente_si_falta_precio():
    tarifas = TarifasConfig()
    assert costo_material(225.0, "MDF Trupan", 3.0, tarifas) is None


def test_costo_material_calculado_si_hay_precio():
    tarifas = TarifasConfig(precio_material_por_m2={"MDF Trupan_3mm": 30000})
    # 225 mm2 = 0.000225 m2
    assert costo_material(225.0, "MDF Trupan", 3.0, tarifas) == pytest.approx(6.75)


def test_costo_tiempo_maquina_pendiente_si_falta_tarifa():
    tarifas = TarifasConfig()
    assert costo_tiempo_maquina(3600, tarifas) is None


def test_costo_tiempo_maquina_calculado_si_hay_tarifa():
    tarifas = TarifasConfig(tarifa_hora_maquina=5000)
    assert costo_tiempo_maquina(3600, tarifas) == pytest.approx(5000.0)


def test_costo_total_none_si_falta_algun_componente():
    assert costo_total([1.0, None, 2.0]) is None


def test_costo_total_suma_si_todos_disponibles():
    assert costo_total([1.0, 2.0, 3.0]) == pytest.approx(6.0)
