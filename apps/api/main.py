"""Servicio Python (FastAPI) desplegado en Vercel como Service interno.

Nunca es público: solo `apps/web` puede llamarlo, vía el binding declarado en
`vercel.json` (env var `PY_API_URL`, inyectada por Vercel). Es el único punto
que escribe a Supabase, siempre a través de la capa SQLAlchemy de
`laser_toolkit` (issue #1/#24) — ver la arquitectura de escritura decidida en
`decisiones-alcance-ampliado`.

`/health` es la prueba end-to-end de #47. Los endpoints de lectura (#48) viven
en `lectura.py`; los de escritura sin generación de G-code (#49) en
`escritura.py`. "Crear suite" y todo lo que genera G-code real (#50) se
agregan de la misma forma sobre esta app.
"""

import escritura
import generacion
import lectura
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ValidationError
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


class AgregarMaterialBody(BaseModel):
    nombre: str
    familia: str


@app.post("/materiales")
def agregar_material(body: AgregarMaterialBody) -> list[dict]:
    with sesion() as s:
        try:
            return escritura.agregar_material(s, body.nombre, body.familia)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/tarifas")
def tarifas() -> dict:
    with sesion() as s:
        return lectura.tarifas_vigentes(s)


class PrecioMaterialBody(BaseModel):
    material: str
    espesorMm: str
    precio: str


class GuardarTarifasBody(BaseModel):
    moneda: str
    tarifaElectricaPorKwh: str
    tarifaHoraMaquina: str
    preciosMaterial: list[PrecioMaterialBody]


@app.put("/tarifas")
def guardar_tarifas(body: GuardarTarifasBody) -> dict:
    with sesion() as s:
        return escritura.guardar_tarifas(
            s,
            moneda=body.moneda,
            tarifa_electrica_por_kwh=float(body.tarifaElectricaPorKwh) if body.tarifaElectricaPorKwh else None,
            tarifa_hora_maquina=float(body.tarifaHoraMaquina) if body.tarifaHoraMaquina else None,
            precios_material=[p.model_dump() for p in body.preciosMaterial],
        )


@app.get("/candidatos")
def candidatos() -> list[dict]:
    with sesion() as s:
        return lectura.candidatos_final_run(s)


class IdentidadCandidatoBody(BaseModel):
    corridaId: str
    idPrueba: str


@app.post("/candidatos")
def marcar_candidato(body: IdentidadCandidatoBody) -> dict:
    with sesion() as s:
        try:
            return escritura.marcar(s, body.corridaId, body.idPrueba)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error


@app.delete("/candidatos")
def desmarcar_candidato(corridaId: str | None = None, idPrueba: str | None = None, archivo: str | None = None) -> dict:
    with sesion() as s:
        if archivo is not None:
            escritura.desmarcar_de_archivo(s, archivo)
            return {"ok": True}
        if corridaId is None or idPrueba is None:
            raise HTTPException(status_code=400, detail="Hace falta corridaId+idPrueba, o archivo.")
        try:
            escritura.desmarcar(s, corridaId, idPrueba)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True}


@app.post("/generar-suite")
def generar_suite(payload: dict) -> dict:
    try:
        return generacion.generar(payload)
    except (ValueError, ValidationError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
