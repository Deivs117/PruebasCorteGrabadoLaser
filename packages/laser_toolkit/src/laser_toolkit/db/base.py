"""Base declarativa y factory de engine/sesion (issue #1, #22, #23).

La cadena de conexion se lee de la variable de entorno `DATABASE_URL` (nunca
hardcodeada, nunca committeada) -- cada entorno (dev/preview vs produccion,
ver #23) la inyecta por su cuenta. Este modulo NO se conecta a nada por su
cuenta al importarse: `crear_engine()`/`crear_fabrica_sesiones()` son
funciones explicitas, para que importar `laser_toolkit.db` (ej. para generar
una migracion de Alembic) nunca dispare un intento de conexion real.
"""

from __future__ import annotations

import os

from dotenv import find_dotenv, load_dotenv
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Carga .env (si existe) al importar el modulo -- solo para desarrollo local:
# en Vercel/CI las variables ya vienen inyectadas por el entorno, y
# `load_dotenv` no pisa una variable que ya este seteada (override=False por
# defecto), asi que esto es un no-op seguro fuera de una maquina de dev.
#
# `usecwd=True` busca .env subiendo desde el directorio de trabajo actual del
# proceso (no desde la ubicacion de este archivo dentro de .venv/) -- hace
# falta porque segun el comando de `make` que se use, el cwd puede ser la
# raiz del repo o packages/laser_toolkit/, y el .env vive en la raiz.
load_dotenv(find_dotenv(usecwd=True))


class Base(DeclarativeBase):
    """Base declarativa de todos los modelos de `laser_toolkit.db.models`."""


def crear_engine(database_url: str | None = None) -> Engine:
    """Crea el engine de SQLAlchemy. Si no se pasa `database_url` explicito,
    lo toma de la variable de entorno `DATABASE_URL` -- falla ruidosamente
    (no en silencio) si no esta configurada, para no conectar por accidente
    a una base equivocada."""
    url = database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL no esta configurada. Cada entorno (dev/preview vs "
            "produccion, ver issue #23) debe inyectarla por su cuenta -- nunca "
            "hardcodear una cadena de conexion en el codigo."
        )
    return create_engine(
        url,
        pool_pre_ping=True,
        # `DATABASE_URL` apunta al pooler de Supabase en modo TRANSACCION
        # (puerto 6543, ver #23) -- ahi la conexion fisica de Postgres que te
        # toca puede haber sido reciclada de otra sesion. psycopg3 por defecto
        # usa "prepared statements" del lado del servidor con nombres
        # autogenerados (`_pg3_0`, `_pg3_1`...); si te toca una conexion que
        # ya tiene preparado ese mismo nombre (de otra sesion), Postgres tira
        # `DuplicatePreparedStatement`. `prepare_threshold=None` desactiva esa
        # cache -- exactamente lo que Supabase/PgBouncer recomienda para el
        # pooler de transacciones. Encontrado corriendo la migracion de #26
        # dos veces seguidas contra produccion real, no es un caso hipotetico.
        connect_args={"prepare_threshold": None},
    )


def crear_fabrica_sesiones(engine: Engine) -> sessionmaker[Session]:
    """Factory de sesiones para ese engine. Uso tipico:

    ```python
    engine = crear_engine()
    Sesion = crear_fabrica_sesiones(engine)
    with Sesion() as sesion:
        ...
    ```
    """
    return sessionmaker(bind=engine, expire_on_commit=False)
