from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from laser_toolkit.db.base import Base
from laser_toolkit.db.models import FamiliaMaterial
from laser_toolkit.db.repo_materiales import listar_materiales, obtener_o_crear_material


@pytest.fixture
def sesion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_obtener_o_crear_es_idempotente(sesion):
    a = obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    b = obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    sesion.commit()
    assert a.id == b.id


def test_no_pisa_la_familia_de_uno_ya_existente(sesion):
    obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    sesion.commit()
    otra_vez = obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.POLIMERO)
    assert otra_vez.familia == FamiliaMaterial.MADERA


def test_listar_ordena_por_nombre(sesion):
    obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    obtener_o_crear_material(sesion, "Acrílico", FamiliaMaterial.POLIMERO)
    sesion.commit()
    nombres = [m.nombre for m in listar_materiales(sesion)]
    assert nombres == sorted(nombres)
