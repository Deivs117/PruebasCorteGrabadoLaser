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

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, ValidationError
from sqlalchemy import text

import creacion
import escritura
import final_run
import generacion
import lectura
import storage_endpoints
import suites_admin
from sesiones import sesion
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


@app.get("/maquina")
def maquina() -> dict:
    with sesion() as s:
        return lectura.configuracion_maquina(s)


class GuardarMaquinaBody(BaseModel):
    laserMaxS: int
    travelFeedMmMin: int
    potenciaModuloW: float
    factorUtilizacionLaser: float
    puntoFocalMm: float
    velocidadMaxMmMin: int
    aceleracionMmS2: float
    areaTrabajoAnchoMm: float
    areaTrabajoAltoMm: float


@app.put("/maquina")
def guardar_maquina(body: GuardarMaquinaBody) -> dict:
    with sesion() as s:
        return escritura.guardar_configuracion_maquina(
            s,
            laser_max_s=body.laserMaxS,
            travel_feed_mm_min=body.travelFeedMmMin,
            potencia_modulo_w=body.potenciaModuloW,
            factor_utilizacion_laser=body.factorUtilizacionLaser,
            punto_focal_mm=body.puntoFocalMm,
            velocidad_max_mm_min=body.velocidadMaxMmMin,
            aceleracion_mm_s2=body.aceleracionMmS2,
            area_trabajo_ancho_mm=body.areaTrabajoAnchoMm,
            area_trabajo_alto_mm=body.areaTrabajoAltoMm,
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
def desmarcar_candidato(corridaId: str, idPrueba: str) -> dict:
    with sesion() as s:
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


@app.post("/suites")
def crear_suite(payload: dict) -> dict:
    with sesion() as s:
        try:
            return creacion.crear(s, payload)
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


@app.get("/suites")
def listar_suites() -> list[dict]:
    with sesion() as s:
        return lectura.suites(s)


@app.get("/suites/{suite_id}")
def obtener_suite(suite_id: int) -> dict:
    with sesion() as s:
        detalle = lectura.suite_detalle(s, suite_id)
        if detalle is None:
            raise HTTPException(status_code=404, detail=f"No existe la suite {suite_id}.")
        return detalle


@app.put("/suites/{suite_id}")
def actualizar_suite(suite_id: int, payload: dict) -> dict:
    with sesion() as s:
        if lectura.suite_detalle(s, suite_id) is None:
            raise HTTPException(status_code=404, detail=f"No existe la suite {suite_id}.")
        try:
            return creacion.actualizar(s, cliente_storage, suite_id, payload)
        except (ValueError, ValidationError) as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.delete("/suites/{suite_id}")
def eliminar_suite(suite_id: int) -> dict:
    with sesion() as s:
        try:
            suites_admin.eliminar_suite(s, cliente_storage, suite_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True}


@app.get("/historial")
def historial(material: str | None = None) -> list[dict]:
    with sesion() as s:
        return lectura.historial(s, material)


@app.get("/dashboard")
def dashboard() -> dict:
    with sesion() as s:
        return lectura.dashboard_resumen(s)


@app.get("/registros")
def listar_registros() -> list[dict]:
    with sesion() as s:
        return lectura.registros(s)


@app.get("/registros/{corrida_id}")
def obtener_registro(corrida_id: str) -> dict:
    with sesion() as s:
        detalle = lectura.registro_detalle(s, corrida_id)
        if detalle is None:
            raise HTTPException(status_code=404, detail=f"No existe la corrida {corrida_id}.")
        return detalle


class CeldaEditableBody(BaseModel):
    idPrueba: str
    cortePasante: str
    carbonizacion1a5: str
    notas: str


class CompletarRegistroBody(BaseModel):
    kwhCorridaMedido: str
    tiempoRealCorridaS: str
    celdas: list[CeldaEditableBody]


@app.put("/registros/{corrida_id}")
def completar_registro(corrida_id: str, body: CompletarRegistroBody) -> dict:
    with sesion() as s:
        try:
            return escritura.completar_registro(
                s,
                corrida_id,
                kwh_corrida_medido=float(body.kwhCorridaMedido) if body.kwhCorridaMedido else None,
                tiempo_real_corrida_s=float(body.tiempoRealCorridaS) if body.tiempoRealCorridaS else None,
                celdas=[c.model_dump() for c in body.celdas],
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.delete("/registros/{corrida_id}")
def eliminar_registro(corrida_id: str) -> dict:
    with sesion() as s:
        try:
            suites_admin.eliminar_registro_por_corrida(s, cliente_storage, corrida_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True}


@app.get("/registros/{corrida_id}/costeo")
def obtener_costeo(corrida_id: str) -> dict:
    with sesion() as s:
        detalle = lectura.costeo_detalle(s, corrida_id)
        if detalle is None:
            raise HTTPException(status_code=404, detail=f"No existe la corrida {corrida_id}.")
        return detalle


@app.post("/registros/{corrida_id}/costeo")
def calcular_costeo(corrida_id: str) -> dict:
    with sesion() as s:
        try:
            return escritura.calcular_costos(s, corrida_id)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/fotos/{corrida_id}/{id_prueba}/url")
def url_foto_celda(corrida_id: str, id_prueba: str) -> dict:
    with sesion() as s:
        try:
            return {"url": storage_endpoints.url_firmada_foto_celda(s, cliente_storage, corrida_id, id_prueba)}
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/fotos-bateria/{corrida_id}/url")
def url_foto_bateria(corrida_id: str) -> dict:
    with sesion() as s:
        try:
            return {"url": storage_endpoints.url_firmada_foto_bateria(s, cliente_storage, corrida_id)}
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/grupos-calibracion")
def listar_grupos_calibracion() -> list[dict]:
    with sesion() as s:
        return lectura.grupos_calibracion(s)


@app.post("/grupos-calibracion")
def crear_ejecucion_final_run(payload: dict) -> dict:
    with sesion() as s:
        try:
            return final_run.crear_ejecucion(s, payload)
        except (ValueError, ValidationError) as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/grupos-calibracion/{grupo_id}/ejecucion")
def generar_siguiente_ejecucion(grupo_id: str) -> dict:
    with sesion() as s:
        try:
            return final_run.generar_siguiente_ejecucion(s, grupo_id)
        except (ValueError, ValidationError) as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/grupos-calibracion/{grupo_id}/resumen")
def resumen_calibracion(grupo_id: str, minimoEjecuciones: int = 3) -> dict:
    with sesion() as s:
        try:
            return lectura.resumen_calibracion(s, grupo_id, minimo_ejecuciones=minimoEjecuciones)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


class FichaBody(BaseModel):
    estado: str
    notas: str | None = None


@app.post("/grupos-calibracion/{grupo_id}/ficha")
def actualizar_ficha(grupo_id: str, body: FichaBody) -> dict:
    with sesion() as s:
        try:
            return final_run.actualizar_ficha(s, grupo_id, estado=body.estado, notas=body.notas)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error


@app.delete("/grupos-calibracion/{grupo_id}")
def eliminar_grupo_calibracion(grupo_id: str) -> dict:
    with sesion() as s:
        try:
            final_run.eliminar_grupo(s, cliente_storage, grupo_id)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        return {"ok": True}
