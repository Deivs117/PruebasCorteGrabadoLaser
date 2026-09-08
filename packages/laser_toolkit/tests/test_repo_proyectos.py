from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from laser_toolkit.db.base import Base
from laser_toolkit.db.models import FamiliaMaterial
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.db.repo_proyectos import (
    actualizar_proyecto,
    crear_proyecto,
    eliminar_proyecto,
    listar_proyectos,
    obtener_proyecto,
    registrar_exportacion,
)


@pytest.fixture
def sesion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


OBJETO_SVG = {
    "id": "obj-1",
    "nombre": "logo.svg",
    "tipo": "svg",
    "xMm": 10.0,
    "yMm": 20.0,
    "anchoMm": 30.0,
    "altoMm": 15.0,
    "rotacionDeg": 90.0,
    "operaciones": ["corte", "grabado"],
    "parametros": {
        "corte": {"velocidadMmMin": 350, "potenciaPct": 100},
        "grabado": {"velocidadMmMin": 1200, "potenciaPct": 25},
    },
    "mantenerProporcion": True,
    "nombreArchivoSvg": "logo.svg",
    "svgStorageKey": "1/obj-1.svg",
    "resolucionRellenoMm": 0.2,
}


def test_crear_y_obtener_proyecto(sesion):
    proyecto = crear_proyecto(sesion, nombre="Logo taller", objetos=[OBJETO_SVG])

    obtenido = obtener_proyecto(sesion, proyecto.id)
    assert obtenido is not None
    assert obtenido.nombre == "Logo taller"
    assert obtenido.objetos == [OBJETO_SVG]
    assert obtenido.material_id is None
    assert obtenido.ficha_parametro_id is None


def test_crear_proyecto_con_material(sesion):
    material = obtener_o_crear_material(sesion, "MDF Trupan", FamiliaMaterial.MADERA)
    proyecto = crear_proyecto(sesion, nombre="Logo en MDF", objetos=[OBJETO_SVG], material_id=material.id)

    assert proyecto.material_id == material.id
    assert proyecto.material is not None
    assert proyecto.material.nombre == "MDF Trupan"


def test_listar_proyectos_mas_reciente_primero(sesion):
    primero = crear_proyecto(sesion, nombre="Primero", objetos=[])
    segundo = crear_proyecto(sesion, nombre="Segundo", objetos=[])

    listado = listar_proyectos(sesion)
    assert [p.id for p in listado] == [segundo.id, primero.id]


def test_actualizar_proyecto_muta_la_misma_fila(sesion):
    proyecto = crear_proyecto(sesion, nombre="Version 1", objetos=[OBJETO_SVG])
    id_original = proyecto.id

    otro_objeto = {**OBJETO_SVG, "xMm": 99.0}
    actualizado = actualizar_proyecto(sesion, proyecto, nombre="Version 2", objetos=[otro_objeto])

    assert actualizado.id == id_original
    assert actualizado.nombre == "Version 2"
    assert actualizado.objetos == [otro_objeto]
    assert len(listar_proyectos(sesion)) == 1


def test_registrar_exportacion_acumula_historial(sesion):
    proyecto = crear_proyecto(sesion, nombre="Con historial", objetos=[])

    registrar_exportacion(sesion, proyecto, "gcode/1-primera.gcode")
    registrar_exportacion(sesion, proyecto, "gcode/1-segunda.gcode")

    assert [e.gcode_storage_key for e in proyecto.exportaciones] == [
        "gcode/1-primera.gcode",
        "gcode/1-segunda.gcode",
    ]


def test_eliminar_proyecto_borra_su_historial_en_cascada(sesion):
    proyecto = crear_proyecto(sesion, nombre="A borrar", objetos=[])
    registrar_exportacion(sesion, proyecto, "gcode/1.gcode")

    eliminar_proyecto(sesion, proyecto)

    assert obtener_proyecto(sesion, proyecto.id) is None
    assert listar_proyectos(sesion) == []
