"""Engine de SQLAlchemy compartido entre requests de este servicio.

Se crea una sola vez por instancia "caliente" de la función (patrón normal en
serverless: reusar conexiones entre invocaciones del mismo contenedor, no
abrir una por request) -- `crear_engine()` ya usa `pool_pre_ping=True` y
desactiva los prepared statements del lado del servidor (ver #26), así que es
seguro compartirlo así contra el pooler de transacciones de Supabase.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from laser_toolkit.db.base import crear_engine, crear_fabrica_sesiones
from sqlalchemy.orm import Session

_engine = crear_engine()
_Sesion = crear_fabrica_sesiones(_engine)


@contextmanager
def sesion() -> Iterator[Session]:
    with _Sesion() as s:
        yield s
