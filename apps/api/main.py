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
import storage_endpoints
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, ValidationError
from sesiones import sesion
from sqlalchemy import text
from storage_cliente import cliente as cliente_storage

app = FastAPI(title="laser-toolkit-api")

EXTENSIONES_FOTO_PERMITIDAS = {"jpg", "jpeg", "png", "webp"}
TAMANO_MAXIMO_FOTO_BYTES = 8 * 1024 * 1024


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


def _extension_de(archivo: UploadFile) -> str:
    extension = (archivo.filename or "").rsplit(".", 1)[-1].lower()
    if extension not in EXTENSIONES_FOTO_PERMITIDAS:
        raise HTTPException(status_code=400, detail="Formato no soportado (usá jpg, png o webp).")
    return extension


async def _contenido_de(archivo: UploadFile) -> bytes:
    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO_FOTO_BYTES:
        raise HTTPException(status_code=400, detail="La foto pesa más de 8MB.")
    return contenido


@app.post("/fotos/{corrida_id}/{id_prueba}")
async def subir_foto_celda(corrida_id: str, id_prueba: str, archivo: UploadFile = File(...)) -> dict:  # noqa: B008
    extension = _extension_de(archivo)
    contenido = await _contenido_de(archivo)
    with sesion() as s:
        try:
            return storage_endpoints.subir_foto_celda(s, cliente_storage, corrida_id, id_prueba, contenido, extension)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error


@app.delete("/fotos/{corrida_id}/{id_prueba}")
def eliminar_foto_celda(corrida_id: str, id_prueba: str) -> dict:
    with sesion() as s:
        try:
            storage_endpoints.eliminar_foto_celda(s, cliente_storage, corrida_id, id_prueba)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True}


@app.post("/fotos-bateria/{corrida_id}")
async def subir_foto_bateria(corrida_id: str, archivo: UploadFile = File(...)) -> dict:  # noqa: B008
    extension = _extension_de(archivo)
    contenido = await _contenido_de(archivo)
    with sesion() as s:
        try:
            return storage_endpoints.subir_foto_bateria(s, cliente_storage, corrida_id, contenido, extension)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error


@app.delete("/fotos-bateria/{corrida_id}")
def eliminar_foto_bateria(corrida_id: str) -> dict:
    with sesion() as s:
        try:
            storage_endpoints.eliminar_foto_bateria(s, cliente_storage, corrida_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True}


@app.get("/descargas/gcode/{corrida_id}")
def descargar_gcode(corrida_id: str) -> dict:
    with sesion() as s:
        try:
            return {"url": storage_endpoints.url_firmada_gcode(s, cliente_storage, corrida_id)}
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/descargas/svg/{suite_id}")
def descargar_svg(suite_id: int) -> dict:
    with sesion() as s:
        try:
            return {"url": storage_endpoints.url_firmada_svg(s, cliente_storage, suite_id)}
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
