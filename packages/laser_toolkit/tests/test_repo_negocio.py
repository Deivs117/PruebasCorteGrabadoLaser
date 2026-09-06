from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from laser_toolkit.db.base import Base
from laser_toolkit.db.models import FamiliaMaterial
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.db.repo_negocio import (
    actualizar_configuracion_maquina,
    construir_machine_config,
    construir_tarifas_config,
    fijar_precio_material,
    obtener_configuracion_maquina,
    obtener_tarifas_vigentes,
    registrar_tarifas,
)


@pytest.fixture
def sesion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_tarifas_historial_es_solo_insercion(sesion):
    registrar_tarifas(sesion, moneda="COP", tarifa_electrica_por_kwh=800.0, tarifa_hora_maquina=5000.0)
    registrar_tarifas(sesion, moneda="COP", tarifa_electrica_por_kwh=900.0, tarifa_hora_maquina=5500.0)
    sesion.commit()

    vigente = obtener_tarifas_vigentes(sesion)
    assert vigente is not None
    assert vigente.tarifa_electrica_por_kwh == 900.0  # la más reciente, no la primera


def test_sin_tarifas_cargadas_devuelve_none(sesion):
    assert obtener_tarifas_vigentes(sesion) is None


def test_construir_tarifas_config_junta_historial_y_precios(sesion):
    material = obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    registrar_tarifas(sesion, moneda="COP", tarifa_electrica_por_kwh=800.0, tarifa_hora_maquina=5000.0)
    fijar_precio_material(sesion, material, 3.0, 20000.0)
    sesion.commit()

    tarifas = construir_tarifas_config(sesion)
    assert tarifas.tarifa_electrica_por_kwh == 800.0
    assert tarifas.precio_material_por_m2["MDF Trupan_3mm"] == 20000.0


def test_construir_tarifas_config_sin_nada_cargado_no_falla(sesion):
    tarifas = construir_tarifas_config(sesion)
    assert tarifas.tarifa_electrica_por_kwh is None
    assert tarifas.precio_material_por_m2 == {}


def test_fijar_precio_material_actualiza_en_vez_de_duplicar(sesion):
    material = obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    fijar_precio_material(sesion, material, 3.0, 20000.0)
    fijar_precio_material(sesion, material, 3.0, 22000.0)
    sesion.commit()

    tarifas = construir_tarifas_config(sesion)
    assert tarifas.precio_material_por_m2["MDF Trupan_3mm"] == 22000.0


def test_configuracion_maquina_se_crea_con_defaults_si_no_existe(sesion):
    config = obtener_configuracion_maquina(sesion)
    sesion.commit()
    assert config.laser_max_s == 10000  # default de MachineConfig
    # Segunda llamada devuelve la MISMA fila, no crea otra.
    otra = obtener_configuracion_maquina(sesion)
    assert otra.id == config.id


def test_construir_machine_config_refleja_lo_guardado(sesion):
    config = obtener_configuracion_maquina(sesion)
    config.velocidad_max_mm_min = 2500
    sesion.commit()

    machine = construir_machine_config(sesion)
    assert machine.velocidad_max_mm_min == 2500


def test_configuracion_maquina_se_crea_con_area_de_trabajo_por_defecto(sesion):
    """Issue #11: el área de trabajo real (300x180mm en la CNC 3018 de este
    taller) también se llena al crear la fila, no solo los campos GRBL."""
    config = obtener_configuracion_maquina(sesion)
    assert config.area_trabajo_ancho_mm == 300.0
    assert config.area_trabajo_alto_mm == 180.0


def test_actualizar_configuracion_maquina_sobreescribe_la_fila_unica(sesion):
    """A diferencia de tarifas (historial de solo inserción), esto es un
    UPDATE-in-place -- pasa a ser el default global real (issue #11)."""
    original = obtener_configuracion_maquina(sesion)
    sesion.commit()

    actualizado = actualizar_configuracion_maquina(
        sesion,
        laser_max_s=1000,
        travel_feed_mm_min=4000,
        potencia_modulo_w=20.0,
        factor_utilizacion_laser=0.9,
        punto_focal_mm=0.1,
        velocidad_max_mm_min=3000,
        aceleracion_mm_s2=60.0,
        area_trabajo_ancho_mm=400.0,
        area_trabajo_alto_mm=250.0,
    )
    sesion.commit()

    assert actualizado.id == original.id  # misma fila, no una nueva
    assert obtener_configuracion_maquina(sesion).laser_max_s == 1000

    machine = construir_machine_config(sesion)
    assert machine.area_trabajo_ancho_mm == 400.0
    assert machine.area_trabajo_alto_mm == 250.0
