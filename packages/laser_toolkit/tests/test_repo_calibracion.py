from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from laser_toolkit.config import Operacion
from laser_toolkit.db.base import Base
from laser_toolkit.db.models import EstadoFicha, FamiliaMaterial, Medicion, Registro
from laser_toolkit.db.repo_calibracion import (
    crear_final_run,
    crear_o_actualizar_ficha,
    obtener_ficha_vigente,
    obtener_o_crear_grupo_calibracion,
    recalcular_costos_ficha,
    resumen_calibracion_de_grupo,
)
from laser_toolkit.tarifas import TarifasConfig


@pytest.fixture
def sesion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _grupo(sesion):
    return obtener_o_crear_grupo_calibracion(
        sesion,
        material="MDF Comercial",
        familia=FamiliaMaterial.MADERA,
        espesor_mm=3.0,
        operacion=Operacion.GRABADO,
        velocidad_mm_min=2000,
        potencia_pct=10,
    )


def test_obtener_o_crear_grupo_es_idempotente_por_combinacion(sesion):
    a = _grupo(sesion)
    b = _grupo(sesion)
    sesion.commit()
    assert a.id == b.id
    assert a.grupo_calibracion_id == "MDF-Comercial_3mm_grabado_2000mmmin_10pct"


def test_resumen_calibracion_respeta_el_minimo_de_ejecuciones_pedido(sesion):
    grupo = _grupo(sesion)
    for ejec in (1, 2, 3):
        final_run = crear_final_run(sesion, grupo, ejecucion=ejec, lote="L01", fecha=date(2026, 9, 4))
        registro = Registro(
            corrida_id=f"FINAL_...ejec{ejec}",
            final_run_id=final_run.id,
            fecha=date(2026, 9, 4),
            lote="L01",
            kwh_corrida_medido=0.05 + ejec * 0.001,
            tiempo_real_corrida_s=100.0 + ejec,
        )
        sesion.add(registro)
    sesion.commit()

    resumen_2 = resumen_calibracion_de_grupo(sesion, grupo, minimo_ejecuciones=3)
    # Con solo 2 de las 3 ejecuciones cargadas seguiria sin calibrar, pero acá
    # ya cargamos las 3 -- confirmamos que el campo `calibrado` refleja el
    # mínimo pedido explícitamente, no solo "hay más de una".
    assert resumen_2.n_ejecuciones == 3
    assert resumen_2.calibrado is True

    resumen_exigente = resumen_calibracion_de_grupo(sesion, grupo, minimo_ejecuciones=5)
    assert resumen_exigente.calibrado is False


def test_resumen_calibracion_de_grupo_divide_por_replicas_de_la_corrida(sesion):
    """Regresión de un bug real (issue #170): antes de este fix, el kWh/tiempo
    medido para TODA la corrida (repeticiones celdas idénticas) se tomaba
    crudo como "por unidad", sin dividir entre las celdas reales."""
    grupo = _grupo(sesion)  # GRABADO, ver _grupo()
    final_run = crear_final_run(
        sesion, grupo, ejecucion=1, lote="L01", fecha=date(2026, 9, 4), repeticiones=5
    )
    registro = Registro(
        corrida_id="FINAL_...ejec1",
        final_run_id=final_run.id,
        fecha=date(2026, 9, 4),
        lote="L01",
        kwh_corrida_medido=0.5,
        tiempo_real_corrida_s=500.0,
    )
    sesion.add(registro)
    sesion.flush()
    for i in range(5):
        sesion.add(
            Medicion(
                registro_id=registro.id,
                id_prueba=f"G-{i:03d}",
                velocidad_mm_min=2000,
                potencia_pct=10,
                pasadas=1,
                x_mm=0.0,
                y_mm=0.0,
                tamano_celda_mm=10.0,
                area_material_mm2=0.0,
                tiempo_estimado_celda_s=20.0,
            )
        )
    sesion.commit()

    resumen = resumen_calibracion_de_grupo(sesion, grupo, minimo_ejecuciones=1)

    # 0.5 kWh / 500s medidos para TODA la corrida de 5 celdas idénticas ->
    # 0.1 kWh y 100s por celda -- no el 0.5/500 crudo (el bug que corrige).
    assert resumen.kwh_por_unidad_medio == pytest.approx(0.1)
    assert resumen.tiempo_por_unidad_s_medio == pytest.approx(100.0)


def test_resumen_calibracion_falla_claro_si_falta_medir_una_ejecucion(sesion):
    grupo = _grupo(sesion)
    final_run = crear_final_run(sesion, grupo, ejecucion=1, lote="L01", fecha=date(2026, 9, 4))
    # Ejecución recién generada, todavía sin kwh/tiempo cargados -- el caso
    # real que motivó el fix de `str(None)` en resumen_calibracion_de_grupo.
    sesion.add(
        Registro(corrida_id="FINAL_...ejec1", final_run_id=final_run.id, fecha=date(2026, 9, 4), lote="L01")
    )
    sesion.commit()

    with pytest.raises(ValueError, match="falta kwh_corrida_medido o tiempo_real_corrida_s"):
        resumen_calibracion_de_grupo(sesion, grupo)


def test_ficha_es_1_a_1_crea_y_luego_actualiza(sesion):
    grupo = _grupo(sesion)
    ficha_1 = crear_o_actualizar_ficha(sesion, grupo, estado=EstadoFicha.EN_REVISION, notas="primera")
    sesion.commit()

    ficha_2 = crear_o_actualizar_ficha(sesion, grupo, estado=EstadoFicha.OFICIAL, notas="segunda")
    sesion.commit()

    assert ficha_1.id == ficha_2.id
    vigente = obtener_ficha_vigente(sesion, grupo)
    assert vigente is not None
    assert vigente.estado == EstadoFicha.OFICIAL
    assert vigente.notas == "segunda"


def test_recalcular_costos_ficha_sin_ejecuciones_medidas_deja_todo_en_none(sesion):
    grupo = _grupo(sesion)
    crear_o_actualizar_ficha(sesion, grupo, estado=EstadoFicha.EN_REVISION)
    sesion.commit()

    ficha = recalcular_costos_ficha(sesion, grupo, TarifasConfig())
    sesion.commit()

    assert ficha.costo_por_mm2 is None
    assert ficha.tiempo_por_mm2_s is None
    assert ficha.material_costo_pendiente is False


def test_recalcular_costos_ficha_grabado_por_mm2(sesion):
    grupo = _grupo(sesion)  # GRABADO, ver _grupo()
    final_run = crear_final_run(
        sesion, grupo, ejecucion=1, lote="L01", fecha=date(2026, 9, 4), tamano_celda_mm=10.0
    )
    sesion.add(
        Registro(
            corrida_id="FINAL_...ejec1",
            final_run_id=final_run.id,
            fecha=date(2026, 9, 4),
            lote="L01",
            kwh_corrida_medido=0.1,
            tiempo_real_corrida_s=200.0,
        )
    )
    sesion.commit()
    crear_o_actualizar_ficha(sesion, grupo, estado=EstadoFicha.EN_REVISION)
    sesion.commit()

    tarifas = TarifasConfig(tarifa_electrica_por_kwh=1000.0, tarifa_hora_maquina=0.0)
    ficha = recalcular_costos_ficha(sesion, grupo, tarifas)
    sesion.commit()

    # kwh_por_unidad_medio = 0.1 (una sola ejecución) -> costo energia = 100.0
    # (tarifa_hora_maquina=0 => costo_tiempo_maquina=0.0, no None) -- área =
    # 10x10 = 100mm2 -> 100.0 / 100 = 1.0 $/mm2.
    assert ficha.costo_por_mm2 == pytest.approx(1.0)
    assert ficha.tiempo_por_mm2_s == pytest.approx(200.0 / 100)
    assert ficha.costo_por_mm is None
    assert ficha.material_costo_pendiente is False  # grabado nunca consume material


def test_recalcular_costos_ficha_corte_marca_material_pendiente_sin_tarifa(sesion):
    grupo = obtener_o_crear_grupo_calibracion(
        sesion,
        material="MDF Comercial",
        familia=FamiliaMaterial.MADERA,
        espesor_mm=3.0,
        operacion=Operacion.CORTE,
        velocidad_mm_min=350,
        potencia_pct=100,
    )
    final_run = crear_final_run(
        sesion, grupo, ejecucion=1, lote="L01", fecha=date(2026, 9, 4), tamano_celda_mm=10.0
    )
    sesion.add(
        Registro(
            corrida_id="FINAL_...ejec1",
            final_run_id=final_run.id,
            fecha=date(2026, 9, 4),
            lote="L01",
            kwh_corrida_medido=0.05,
            tiempo_real_corrida_s=60.0,
        )
    )
    sesion.commit()
    crear_o_actualizar_ficha(sesion, grupo, estado=EstadoFicha.EN_REVISION)
    sesion.commit()

    # Sin precio_material_por_m2 cargado para "MDF Comercial_3.0mm".
    ficha = recalcular_costos_ficha(sesion, grupo, TarifasConfig(tarifa_electrica_por_kwh=1.0))
    sesion.commit()

    assert ficha.material_costo_pendiente is True
    assert ficha.costo_por_mm is None  # falta un componente -> costo_total() da None
    # El tiempo por mm no depende de tarifas, se calcula siempre que haya
    # al menos una ejecución medida.
    longitud_mm = 4 * 10.0 * final_run.pasadas
    assert ficha.tiempo_por_mm_s == pytest.approx(60.0 / longitud_mm)
