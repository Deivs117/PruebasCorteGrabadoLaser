"""Servicio Python (FastAPI) desplegado en Vercel como Service interno.

Nunca es público: solo `apps/web` puede llamarlo, vía el binding declarado en
`vercel.json` (env var `PY_API_URL`, inyectada por Vercel). Es el único punto
que escribe a Supabase, siempre a través de la capa SQLAlchemy de
`laser_toolkit` (issue #1/#24) — ver la arquitectura de escritura decidida en
`decisiones-alcance-ampliado`.

Por ahora solo trae `/health`, la prueba end-to-end de #47: confirma que este
servicio puede resolver `laser_toolkit` (empaquetado vía uv, path relativo a
`packages/laser_toolkit`) y hablarle a Supabase real desde el runtime de
Vercel. Los endpoints de negocio (#48-#51) se agregan sobre esta misma app.
"""

from fastapi import FastAPI
from sqlalchemy import text

from laser_toolkit.db.base import crear_engine

app = FastAPI(title="laser-toolkit-api")


@app.get("/health")
def health() -> dict:
    engine = crear_engine()
    with engine.connect() as conexion:
        fila = conexion.execute(text("select count(*) from materiales")).fetchone()
    return {"ok": True, "materiales": fila[0] if fila else None}
