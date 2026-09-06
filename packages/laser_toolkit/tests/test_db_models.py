"""Verifica que el schema de la issue #22 sea realmente creable y coherente:
relaciones, constraints de unicidad y el CheckConstraint de origen único de
`Registro`. Corre contra SQLite en memoria a propósito (ver nota de tipado
JSON en `db/models.py`) -- no depende de una Supabase real para este nivel
de test; la integración contra Postgres real es del issue #24/#26.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from laser_toolkit.db.base import Base
from laser_toolkit.db.models import (
    CandidatoFinalRun,
    EstadoFicha,
    FamiliaMaterial,
    FichaParametro,
    FinalRun,
    GrupoCalibracion,
    Material,
    Medicion,
    Operacion,
    Registro,
    Suite,
)


@pytest.fixture
def sesion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _material(sesion, nombre="MDF Trupan", familia=FamiliaMaterial.MADERA) -> Material:
    m = Material(nombre=nombre, familia=familia)
    sesion.add(m)
    sesion.flush()
    return m


def test_crea_todas_las_tablas_sin_error(sesion):
    # Si create_all (en el fixture) no lanzo, ya es la primera senal de que
    # el schema es valido -- este test solo lo deja explicito.
    assert sesion.bind is not None


def test_material_unico_por_nombre(sesion):
    _material(sesion, nombre="MDF Trupan")
    sesion.commit()
    sesion.add(Material(nombre="MDF Trupan", familia=FamiliaMaterial.MADERA))
    with pytest.raises(IntegrityError):
        sesion.flush()


def test_suite_a_registro_a_medicion(sesion):
    material = _material(sesion)
    suite = Suite(
        material_id=material.id,
        espesor_mm=3.0,
        operacion=Operacion.CORTE,
        velocidades_mm_min=[350, 400],
        potencias_pct=[100],
        lote="L07",
        fecha=date(2026, 9, 3),
    )
    sesion.add(suite)
    sesion.flush()

    registro = Registro(
        corrida_id="MDF-Trupan_3mm_corte_2026-09-03_L07",
        suite_id=suite.id,
        fecha=date(2026, 9, 3),
        lote="L07",
        kwh_corrida_medido=0.05,
        tiempo_real_corrida_s=180,
    )
    sesion.add(registro)
    sesion.flush()

    medicion = Medicion(
        registro_id=registro.id,
        id_prueba="C-001",
        velocidad_mm_min=350,
        potencia_pct=100,
        pasadas=2,
        x_mm=0.0,
        y_mm=0.0,
        tamano_celda_mm=30.0,
        area_material_mm2=900.0,
        tiempo_estimado_celda_s=57.92,
        corte_pasante=True,
        carbonizacion_1a5=2,
    )
    sesion.add(medicion)
    sesion.commit()

    recargado = sesion.get(Registro, registro.id)
    assert recargado.suite.material.nombre == "MDF Trupan"
    assert len(recargado.mediciones) == 1
    assert recargado.mediciones[0].id_prueba == "C-001"


def test_registro_exige_exactamente_un_origen(sesion):
    material = _material(sesion)
    suite = Suite(
        material_id=material.id,
        espesor_mm=3.0,
        operacion=Operacion.CORTE,
        velocidades_mm_min=[350],
        potencias_pct=[100],
        lote="L01",
        fecha=date(2026, 9, 3),
    )
    sesion.add(suite)
    sesion.flush()

    # Ni suite_id ni final_run_id -> viola el CheckConstraint.
    sesion.add(Registro(corrida_id="sin-origen", fecha=date(2026, 9, 3), lote="L01"))
    with pytest.raises(IntegrityError):
        sesion.commit()
    sesion.rollback()

    # Los dos a la vez -> igual viola el CheckConstraint (XOR).
    final_run_grupo = GrupoCalibracion(
        grupo_calibracion_id="MDF-Trupan_3mm_corte_350mmmin_100pct",
        material_id=material.id,
        espesor_mm=3.0,
        operacion=Operacion.CORTE,
        velocidad_mm_min=350,
        potencia_pct=100,
    )
    sesion.add(final_run_grupo)
    sesion.flush()
    final_run = FinalRun(
        grupo_calibracion_id=final_run_grupo.id, ejecucion=1, lote="L01", fecha=date(2026, 9, 3)
    )
    sesion.add(final_run)
    sesion.flush()

    sesion.add(
        Registro(
            corrida_id="doble-origen",
            suite_id=suite.id,
            final_run_id=final_run.id,
            fecha=date(2026, 9, 3),
            lote="L01",
        )
    )
    with pytest.raises(IntegrityError):
        sesion.commit()


def test_grupo_calibracion_a_final_run_a_ficha(sesion):
    material = _material(sesion, nombre="MDF Comercial")
    grupo = GrupoCalibracion(
        grupo_calibracion_id="MDF-Comercial_3mm_grabado_2000mmmin_10pct",
        material_id=material.id,
        espesor_mm=3.0,
        operacion=Operacion.GRABADO,
        velocidad_mm_min=2000,
        potencia_pct=10,
    )
    sesion.add(grupo)
    sesion.flush()

    for ejec in (1, 2, 3):
        fr = FinalRun(grupo_calibracion_id=grupo.id, ejecucion=ejec, lote="L01", fecha=date(2026, 9, 4))
        sesion.add(fr)
    sesion.flush()

    ficha = FichaParametro(
        grupo_calibracion_id=grupo.id, estado=EstadoFicha.OFICIAL, costo_estandar_total=1200.5
    )
    sesion.add(ficha)
    sesion.commit()

    recargado = sesion.get(GrupoCalibracion, grupo.id)
    assert len(recargado.final_runs) == 3
    assert recargado.ficha_parametro.estado == EstadoFicha.OFICIAL

    # Un grupo solo puede tener UNA ficha (relación 1:1 por unique constraint).
    sesion.add(FichaParametro(grupo_calibracion_id=grupo.id, estado=EstadoFicha.EN_REVISION))
    with pytest.raises(IntegrityError):
        sesion.commit()


def test_candidato_final_run_referencia_una_medicion_unica(sesion):
    material = _material(sesion)
    suite = Suite(
        material_id=material.id,
        espesor_mm=3.0,
        operacion=Operacion.CORTE,
        velocidades_mm_min=[350],
        potencias_pct=[100],
        lote="L15",
        fecha=date(2026, 9, 4),
    )
    sesion.add(suite)
    sesion.flush()
    registro = Registro(
        corrida_id="MDF-Comercial_3mm_corte_2026-09-04_L15",
        suite_id=suite.id,
        fecha=date(2026, 9, 4),
        lote="L15",
    )
    sesion.add(registro)
    sesion.flush()
    medicion = Medicion(
        registro_id=registro.id,
        id_prueba="C-001",
        velocidad_mm_min=440,
        potencia_pct=100,
        pasadas=1,
        x_mm=0,
        y_mm=0,
        tamano_celda_mm=15,
        area_material_mm2=225,
        tiempo_estimado_celda_s=20.5,
    )
    sesion.add(medicion)
    sesion.flush()

    sesion.add(CandidatoFinalRun(medicion_id=medicion.id))
    sesion.commit()

    # No se puede marcar la misma medición como candidata dos veces.
    sesion.add(CandidatoFinalRun(medicion_id=medicion.id))
    with pytest.raises(IntegrityError):
        sesion.commit()
