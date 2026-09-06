"""Endpoints de Storage (#51): subir fotos (por celda o de toda la
batería) y generar URLs firmadas de descarga para G-code/SVG ya subidos.

Sin dependencia de FastAPI a propósito (mismo patrón que `lectura.py`/
`escritura.py`): funciones que levantan `ValueError` en errores de negocio,
`main.py` las traduce a HTTP.

Cubre registros de Suite (barrido) y de FinalRun (E, #64) por igual --
`_material_de` resuelve el material para armar la ruta de Storage
(`<material_slug>/...`) sin importar el origen."""

from __future__ import annotations

from laser_toolkit.db.models import Medicion, Registro, Suite
from laser_toolkit.db.repo_pruebas import (
    guardar_foto_bateria_key,
    guardar_foto_medicion_key,
)
from laser_toolkit.storage.operaciones import (
    BUCKET_FOTOS,
    BUCKET_GCODE,
    BUCKET_SVG,
    eliminar,
    subir_foto,
    url_firmada,
)
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import Client

ID_CELDA_BATERIA = "bateria"


def _registro_por_corrida(sesion: Session, corrida_id: str) -> Registro:
    registro = sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id))
    if registro is None:
        raise ValueError(f"No existe la corrida {corrida_id}.")
    return registro


def _material_de(registro: Registro) -> str:
    if registro.suite is not None:
        return registro.suite.material.nombre
    if registro.final_run is not None:
        return registro.final_run.grupo_calibracion.material.nombre
    raise ValueError(f"La corrida {registro.corrida_id} no tiene Suite ni FinalRun asociado.")


def _medicion_por_identidad(sesion: Session, corrida_id: str, id_prueba: str) -> Medicion:
    medicion = sesion.scalar(
        select(Medicion)
        .join(Registro, Medicion.registro_id == Registro.id)
        .where(Registro.corrida_id == corrida_id, Medicion.id_prueba == id_prueba)
    )
    if medicion is None:
        raise ValueError(f"No existe la medición {id_prueba} de la corrida {corrida_id}.")
    return medicion


def subir_foto_celda(
    sesion: Session, cliente: Client, corrida_id: str, id_prueba: str, contenido: bytes, extension: str
) -> dict:
    medicion = _medicion_por_identidad(sesion, corrida_id, id_prueba)
    material = _material_de(medicion.registro)
    key = subir_foto(cliente, material, corrida_id, id_prueba, contenido, extension)
    guardar_foto_medicion_key(sesion, medicion, key)
    sesion.commit()
    return {"ok": True, "fotoStorageKey": key}


def subir_foto_bateria(sesion: Session, cliente: Client, corrida_id: str, contenido: bytes, extension: str) -> dict:
    registro = _registro_por_corrida(sesion, corrida_id)
    material = _material_de(registro)
    key = subir_foto(cliente, material, corrida_id, ID_CELDA_BATERIA, contenido, extension)
    guardar_foto_bateria_key(sesion, registro, key)
    sesion.commit()
    return {"ok": True, "fotoStorageKey": key}


def eliminar_foto_celda(sesion: Session, cliente: Client, corrida_id: str, id_prueba: str) -> None:
    medicion = _medicion_por_identidad(sesion, corrida_id, id_prueba)
    if medicion.foto_storage_key:
        eliminar(cliente, "fotos", medicion.foto_storage_key)
        guardar_foto_medicion_key(sesion, medicion, None)
        sesion.commit()


def eliminar_foto_bateria(sesion: Session, cliente: Client, corrida_id: str) -> None:
    registro = _registro_por_corrida(sesion, corrida_id)
    if registro.foto_bateria_storage_key:
        eliminar(cliente, "fotos", registro.foto_bateria_storage_key)
        guardar_foto_bateria_key(sesion, registro, None)
        sesion.commit()


def url_firmada_foto_celda(sesion: Session, cliente: Client, corrida_id: str, id_prueba: str) -> str:
    medicion = _medicion_por_identidad(sesion, corrida_id, id_prueba)
    if not medicion.foto_storage_key:
        raise ValueError(f"No hay foto subida para la celda {id_prueba} de la corrida {corrida_id}.")
    return url_firmada(cliente, BUCKET_FOTOS, medicion.foto_storage_key)


def url_firmada_foto_bateria(sesion: Session, cliente: Client, corrida_id: str) -> str:
    registro = _registro_por_corrida(sesion, corrida_id)
    if not registro.foto_bateria_storage_key:
        raise ValueError(f"No hay foto de batería subida para la corrida {corrida_id}.")
    return url_firmada(cliente, BUCKET_FOTOS, registro.foto_bateria_storage_key)


def url_firmada_gcode(sesion: Session, cliente: Client, corrida_id: str) -> str:
    registro = sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id))
    if registro is None or not registro.gcode_storage_key:
        raise ValueError(f"No hay un .gcode subido para la corrida {corrida_id}.")
    return url_firmada(cliente, BUCKET_GCODE, registro.gcode_storage_key)


def url_firmada_svg(sesion: Session, cliente: Client, suite_id: int) -> str:
    suite = sesion.get(Suite, suite_id)
    if suite is None or not suite.svg_storage_key:
        raise ValueError(f"No hay un SVG subido para la suite {suite_id}.")
    return url_firmada(cliente, BUCKET_SVG, suite.svg_storage_key)


__all__ = [
    "eliminar_foto_bateria",
    "eliminar_foto_celda",
    "subir_foto_bateria",
    "subir_foto_celda",
    "url_firmada_foto_bateria",
    "url_firmada_foto_celda",
    "url_firmada_gcode",
    "url_firmada_svg",
]
