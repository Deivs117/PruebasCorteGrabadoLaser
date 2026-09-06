from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from laser_toolkit.config import Operacion
from laser_toolkit.db.base import Base
from laser_toolkit.db.models import FamiliaMaterial
from laser_toolkit.db.repo_pruebas import (
    actualizar_registro,
    actualizar_suite,
    calcular_y_guardar_costos_registro,
    completar_evaluacion,
    completar_medicion_corrida,
    crear_registro_de_suite,
    crear_suite,
    desmarcar_candidato,
    guardar_gcode_key,
    listar_candidatos,
    marcar_candidato,
    reemplazar_mediciones,
    registrar_mediciones_generadas,
    tiene_datos_cargados,
)
from laser_toolkit.tarifas import TarifasConfig


@pytest.fixture
def sesion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


FILAS_GENERADAS = [
    {
        "id_prueba": "C-001",
        "velocidad_mm_min": 350,
        "potencia_pct": 100,
        "pasadas": 2,
        "x_mm": 0.0,
        "y_mm": 0.0,
        "tamano_celda_mm": 30.0,
        "area_material_mm2": 900.0,
        "tiempo_estimado_celda_s": 60.0,
    },
    {
        "id_prueba": "C-002",
        "velocidad_mm_min": 400,
        "potencia_pct": 100,
        "pasadas": 2,
        "x_mm": 38.0,
        "y_mm": 0.0,
        "tamano_celda_mm": 30.0,
        "area_material_mm2": 900.0,
        "tiempo_estimado_celda_s": 40.0,
    },
]


def _armar_registro_con_mediciones(sesion):
    suite = crear_suite(
        sesion,
        material="MDF Trupan",
        familia=FamiliaMaterial.MADERA,
        espesor_mm=3.0,
        operacion=Operacion.CORTE,
        velocidades_mm_min=[350, 400],
        potencias_pct=[100],
        lote="L07",
        fecha=date(2026, 9, 3),
    )
    registro = crear_registro_de_suite(
        sesion, suite, corrida_id="MDF-Trupan_3mm_corte_2026-09-03_L07", fecha=date(2026, 9, 3), lote="L07"
    )
    registrar_mediciones_generadas(sesion, registro, FILAS_GENERADAS)
    return registro


def test_flujo_completo_generar_evaluar_costear(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    assert len(registro.mediciones) == 2

    completar_medicion_corrida(sesion, registro, kwh_corrida_medido=0.05, tiempo_real_corrida_s=100.0)
    for medicion in registro.mediciones:
        completar_evaluacion(sesion, medicion, corte_pasante=True, carbonizacion_1a5=2)

    tarifas = TarifasConfig(
        tarifa_electrica_por_kwh=800.0,
        tarifa_hora_maquina=5000.0,
        precio_material_por_m2={"MDF Trupan_3mm": 20000.0},
    )
    mediciones = calcular_y_guardar_costos_registro(sesion, registro, tarifas)
    sesion.commit()

    # Prorrateo por peso de tiempo: la celda de 60s (60% del total) se lleva
    # el 60% del kWh/tiempo medido de la corrida completa.
    por_prueba = {m.id_prueba: m for m in mediciones}
    assert por_prueba["C-001"].kwh_celda == pytest.approx(0.03)
    assert por_prueba["C-001"].tiempo_maquina_celda_s == pytest.approx(60.0)
    assert por_prueba["C-001"].costo_total_celda is not None
    # Ningún componente queda None: las tres tarifas estaban definidas.
    assert por_prueba["C-002"].costo_energia_celda is not None
    assert por_prueba["C-002"].costo_material_celda is not None
    assert por_prueba["C-002"].costo_tiempo_maquina_celda is not None


def test_costeo_sin_tarifas_deja_columnas_pendientes_no_cero(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    completar_medicion_corrida(sesion, registro, kwh_corrida_medido=0.05, tiempo_real_corrida_s=100.0)

    tarifas_vacias = TarifasConfig()  # nada definido todavía
    mediciones = calcular_y_guardar_costos_registro(sesion, registro, tarifas_vacias)

    for medicion in mediciones:
        assert medicion.costo_energia_celda is None
        assert medicion.costo_material_celda is None
        assert medicion.costo_tiempo_maquina_celda is None
        assert medicion.costo_total_celda is None
        # La cantidad física medida SÍ se calcula, aunque la tarifa falte.
        assert medicion.kwh_celda is not None


def test_completar_evaluacion_no_pisa_lo_ya_cargado(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    medicion = registro.mediciones[0]
    completar_evaluacion(sesion, medicion, corte_pasante=True, notas="primera pasada")
    completar_evaluacion(sesion, medicion, carbonizacion_1a5=3)
    assert medicion.corte_pasante is True
    assert medicion.notas == "primera pasada"
    assert medicion.carbonizacion_1a5 == 3


def test_guardar_gcode_key_asocia_la_key_de_storage(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    assert registro.gcode_storage_key is None
    guardar_gcode_key(sesion, registro, "MDF-Trupan/MDF-Trupan_3mm_corte_2026-09-03_L07.gcode")
    assert registro.gcode_storage_key == "MDF-Trupan/MDF-Trupan_3mm_corte_2026-09-03_L07.gcode"


def test_tiene_datos_cargados_falso_recien_generado(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    assert tiene_datos_cargados(registro) is False


def test_tiene_datos_cargados_por_medicion_de_corrida(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    completar_medicion_corrida(sesion, registro, kwh_corrida_medido=0.05, tiempo_real_corrida_s=100.0)
    assert tiene_datos_cargados(registro) is True


def test_tiene_datos_cargados_por_evaluacion_de_una_sola_celda(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    completar_evaluacion(sesion, registro.mediciones[0], corte_pasante=True)
    assert tiene_datos_cargados(registro) is True


def test_actualizar_suite_muta_la_fila_sin_crear_una_nueva(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    assert registro.suite is not None
    suite = registro.suite
    suite_id = suite.id

    actualizar_suite(
        sesion,
        suite,
        material="MDF Trupan",
        familia=FamiliaMaterial.MADERA,
        espesor_mm=5.0,
        operacion=Operacion.CORTE,
        velocidades_mm_min=[500],
        potencias_pct=[80],
        lote="L08",
        fecha=date(2026, 9, 6),
    )
    sesion.commit()

    assert suite.id == suite_id
    assert suite.espesor_mm == 5.0
    assert suite.velocidades_mm_min == [500]
    assert suite.lote == "L08"


def test_actualizar_registro_cambia_corrida_id_sin_perder_el_registro(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    registro_id = registro.id

    actualizar_registro(
        sesion, registro, corrida_id="MDF-Trupan_5mm_corte_2026-09-06_L08", fecha=date(2026, 9, 6), lote="L08"
    )
    sesion.commit()

    assert registro.id == registro_id
    assert registro.corrida_id == "MDF-Trupan_5mm_corte_2026-09-06_L08"
    assert registro.lote == "L08"


def test_reemplazar_mediciones_descarta_las_anteriores(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    assert {m.id_prueba for m in registro.mediciones} == {"C-001", "C-002"}

    filas_nuevas = [
        {
            "id_prueba": "C-001",
            "velocidad_mm_min": 500,
            "potencia_pct": 80,
            "pasadas": 1,
            "x_mm": 0.0,
            "y_mm": 0.0,
            "tamano_celda_mm": 30.0,
            "area_material_mm2": 900.0,
            "tiempo_estimado_celda_s": 30.0,
        }
    ]
    reemplazar_mediciones(sesion, registro, filas_nuevas)
    sesion.commit()

    assert {m.id_prueba for m in registro.mediciones} == {"C-001"}
    assert registro.mediciones[0].velocidad_mm_min == 500


def test_marcar_y_desmarcar_candidato_es_idempotente(sesion):
    registro = _armar_registro_con_mediciones(sesion)
    medicion = registro.mediciones[0]

    c1 = marcar_candidato(sesion, medicion)
    c2 = marcar_candidato(sesion, medicion)
    sesion.commit()
    assert c1.id == c2.id
    assert len(listar_candidatos(sesion)) == 1

    desmarcar_candidato(sesion, medicion)
    sesion.commit()
    assert listar_candidatos(sesion) == []
