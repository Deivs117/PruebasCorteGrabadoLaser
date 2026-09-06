from __future__ import annotations

from unittest.mock import patch

import pytest

from laser_toolkit.db.base import crear_engine


def test_crear_engine_falla_ruidosamente_sin_database_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        crear_engine()


def test_crear_engine_desactiva_prepared_statements_del_lado_del_servidor():
    """Regresión: DATABASE_URL apunta al pooler de Supabase en modo
    TRANSACCION (#23) -- sin `prepare_threshold=None`, psycopg3 usa
    prepared statements con nombre autogenerado que pueden chocar con los
    de otra sesión que reusó la misma conexión física del pool
    (`DuplicatePreparedStatement`). Encontrado corriendo la migración de
    #26 dos veces seguidas contra producción real."""
    with patch("laser_toolkit.db.base.create_engine") as create_engine_mock:
        crear_engine("postgresql+psycopg://user:pass@localhost/db")
    _, kwargs = create_engine_mock.call_args
    assert kwargs["connect_args"] == {"prepare_threshold": None}
