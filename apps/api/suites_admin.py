"""Eliminar una suite (A, issue #54) -- en cascada: sus Registro/Mediciones/
Candidatos, más el `.gcode` y las fotos que tenga en Storage.

Sin dependencia de FastAPI a propósito (mismo patrón que `lectura.py`/
`escritura.py`): levanta `ValueError` en errores de negocio, `main.py` los
traduce a HTTP.
"""

from __future__ import annotations

from laser_toolkit.db.models import CandidatoFinalRun, Suite
from laser_toolkit.storage.operaciones import eliminar as eliminar_de_storage
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import Client


def eliminar_suite(sesion: Session, cliente_storage: Client, suite_id: int) -> None:
    """Espejo de `eliminarSuite` en `fs-data.ts`, pero real: en el sistema de
    archivos borrar el YAML no tocaba ningún G-code/csv ya generado (por
    eso el diálogo de confirmación en TS aclaraba "esto no borra ningún
    G-code ya generado") -- acá sí hay una fila real de Registro/Mediciones
    detrás, así que se borra todo junto: no dejar un Registro huérfano de su
    Suite (la relación es obligatoria, `Registro.suite_id` no es opcional en
    este flujo)."""
    suite = sesion.get(Suite, suite_id)
    if suite is None:
        raise ValueError(f"No existe la suite {suite_id}.")

    for registro in suite.registros:
        medicion_ids = [m.id for m in registro.mediciones]
        if medicion_ids:
            candidatos = sesion.scalars(
                select(CandidatoFinalRun).where(CandidatoFinalRun.medicion_id.in_(medicion_ids))
            )
            for candidato in candidatos:
                sesion.delete(candidato)
            sesion.flush()

        for medicion in registro.mediciones:
            if medicion.foto_storage_key:
                eliminar_de_storage(cliente_storage, "fotos", medicion.foto_storage_key)
        if registro.foto_bateria_storage_key:
            eliminar_de_storage(cliente_storage, "fotos", registro.foto_bateria_storage_key)
        if registro.gcode_storage_key:
            eliminar_de_storage(cliente_storage, "gcode", registro.gcode_storage_key)

        sesion.delete(registro)  # cascada ORM borra las Mediciones (ver models.py)

    if suite.svg_storage_key:
        eliminar_de_storage(cliente_storage, "svg", suite.svg_storage_key)

    sesion.delete(suite)
    sesion.commit()


__all__ = ["eliminar_suite"]
