"""Servicio Python (FastAPI) desplegado en Vercel como Service interno.

Nunca es público: solo `apps/web` puede llamarlo, vía el binding declarado en
`vercel.json` (env var `PY_API_URL`, inyectada por Vercel). Es el único punto
que escribe a Supabase, siempre a través de la capa SQLAlchemy de
`laser_toolkit` (issue #1/#24) — ver la arquitectura de escritura decidida en
`decisiones-alcance-ampliado`.

`/health` es la prueba end-to-end de #47. Los endpoints de lectura (#48) viven
en `lectura.py`; los de escritura/generación/storage (#49-#51) se agregan de
la misma forma sobre esta app.
"""

import lectura
from fastapi import FastAPI
from sesiones import sesion
from sqlalchemy import text

app = FastAPI(title="laser-toolkit-api")


@app.get("/health")
def health() -> dict:
    with sesion() as s:
        fila = s.execute(text("select count(*) from materiales")).fetchone()
    return {"ok": True, "materiales": fila[0] if fila else None}


@app.get("/materiales")
def materiales() -> list[dict]:
    with sesion() as s:
        return lectura.materiales_catalogo(s)


@app.get("/tarifas")
def tarifas() -> dict:
    with sesion() as s:
        return lectura.tarifas_vigentes(s)


@app.get("/candidatos")
def candidatos() -> list[dict]:
    with sesion() as s:
        return lectura.candidatos_final_run(s)
