from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from laser_toolkit.config import Operacion
from laser_toolkit.db.base import Base
from laser_toolkit.db.models import EstadoFicha, FamiliaMaterial, Registro
from laser_toolkit.db.repo_calibracion import (
    crear_final_run,
    crear_o_actualizar_ficha,
    obtener_ficha_vigente,
    obtener_o_crear_grupo_calibracion,
    resumen_calibracion_de_grupo,
)


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
    ficha_1 = crear_o_actualizar_ficha(
        sesion, grupo, estado=EstadoFicha.EN_REVISION, costo_estandar_total=100.0
    )
    sesion.commit()

    ficha_2 = crear_o_actualizar_ficha(sesion, grupo, estado=EstadoFicha.OFICIAL, costo_estandar_total=95.0)
    sesion.commit()

    assert ficha_1.id == ficha_2.id
    vigente = obtener_ficha_vigente(sesion, grupo)
    assert vigente is not None
    assert vigente.estado == EstadoFicha.OFICIAL
    assert vigente.costo_estandar_total == 95.0
