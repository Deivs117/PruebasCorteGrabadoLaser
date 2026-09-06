"""Funciones de alto nivel sobre `grupos_calibracion`, `final_runs` y
`fichas_parametro` (issue #24) -- el flujo de Final Run (Plan Maestro,
sección 8) y su salida final, la Ficha de Parámetro Estándar (F6, #7).
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from laser_toolkit.calibracion import ResumenCalibracion, resumir_calibracion
from laser_toolkit.config import FinalRunConfig, Operacion
from laser_toolkit.db.models import EstadoFicha, FamiliaMaterial, FichaParametro, FinalRun, GrupoCalibracion
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.naming import id_grupo_calibracion


def obtener_o_crear_grupo_calibracion(
    sesion: Session,
    *,
    material: str,
    familia: FamiliaMaterial,
    espesor_mm: float,
    operacion: Operacion,
    velocidad_mm_min: int,
    potencia_pct: int,
) -> GrupoCalibracion:
    """Resuelve el `GrupoCalibracion` de esta combinación, creándolo si es la
    primera vez. El `grupo_calibracion_id` textual se calcula con
    `laser_toolkit.naming.id_grupo_calibracion` -- construir un
    `FinalRunConfig` acá de paso también valida la combinación (ej. contra
    `velocidad_max_mm_min`) con las mismas reglas que ya usa el CLI, en vez
    de reimplementarlas."""
    config = FinalRunConfig(
        material=material,
        espesor_mm=espesor_mm,
        operacion=operacion,
        velocidad_mm_min=velocidad_mm_min,
        potencia_pct=potencia_pct,
    )
    texto_id = id_grupo_calibracion(config)

    existente = sesion.scalar(
        select(GrupoCalibracion).where(GrupoCalibracion.grupo_calibracion_id == texto_id)
    )
    if existente is not None:
        return existente

    material_row = obtener_o_crear_material(sesion, material, familia)
    grupo = GrupoCalibracion(
        grupo_calibracion_id=texto_id,
        material_id=material_row.id,
        espesor_mm=espesor_mm,
        operacion=operacion,
        velocidad_mm_min=velocidad_mm_min,
        potencia_pct=potencia_pct,
    )
    sesion.add(grupo)
    sesion.flush()
    return grupo


def crear_final_run(
    sesion: Session,
    grupo: GrupoCalibracion,
    *,
    ejecucion: int,
    lote: str,
    fecha: date,
    repeticiones: int = 5,
    pasadas: int = 1,
    z_step_mm: float = 0.0,
    tamano_celda_mm: float = 15.0,
    espaciado_mm: float = 5.0,
    id_prefijo: str = "F",
) -> FinalRun:
    """Una ejecución independiente de la Final Run de `grupo` -- ver
    `UniqueConstraint(grupo_calibracion_id, ejecucion)`: no se puede crear la
    misma ejecución dos veces para el mismo grupo."""
    final_run = FinalRun(
        grupo_calibracion_id=grupo.id,
        ejecucion=ejecucion,
        repeticiones=repeticiones,
        pasadas=pasadas,
        z_step_mm=z_step_mm,
        tamano_celda_mm=tamano_celda_mm,
        espaciado_mm=espaciado_mm,
        id_prefijo=id_prefijo,
        lote=lote,
        fecha=fecha,
    )
    sesion.add(final_run)
    sesion.flush()
    return final_run


def resumen_calibracion_de_grupo(
    sesion: Session, grupo: GrupoCalibracion, minimo_ejecuciones: int = 3
) -> ResumenCalibracion:
    """Resumen estadístico entre todas las ejecuciones ya completadas
    (kwh_corrida_medido/tiempo_real_corrida_s cargados) de este grupo -- reusa
    `laser_toolkit.calibracion.resumir_calibracion` tal cual, alimentándolo
    con las filas de `Registro`/`Medicion` en vez de un csv.

    Levanta `ValueError` si alguna ejecución todavía no tiene las mediciones
    de la corrida completa cargadas -- calibrar exige mediciones reales, sin
    respaldo de estimación (igual que la versión basada en csv)."""
    filas = [
        {
            "grupo_calibracion_id": grupo.grupo_calibracion_id,
            "corrida_id": registro.corrida_id,
            "kwh_corrida_medido": registro.kwh_corrida_medido,
            "tiempo_real_corrida_s": registro.tiempo_real_corrida_s,
        }
        for final_run in grupo.final_runs
        for registro in final_run.registros
    ]
    return resumir_calibracion(filas, minimo_ejecuciones=minimo_ejecuciones)


def crear_o_actualizar_ficha(
    sesion: Session,
    grupo: GrupoCalibracion,
    *,
    estado: EstadoFicha,
    costo_estandar_total: float | None = None,
    fecha_validacion: date | None = None,
    notas: str | None = None,
) -> FichaParametro:
    """Un grupo tiene a lo sumo una ficha (relación 1:1, ver `UniqueConstraint`
    en `FichaParametro.grupo_calibracion_id`) -- esta función crea la primera
    vez y actualiza las siguientes, nunca duplica."""
    ficha = sesion.scalar(select(FichaParametro).where(FichaParametro.grupo_calibracion_id == grupo.id))
    if ficha is None:
        ficha = FichaParametro(grupo_calibracion_id=grupo.id, estado=estado)
        sesion.add(ficha)

    ficha.estado = estado
    if costo_estandar_total is not None:
        ficha.costo_estandar_total = costo_estandar_total
    if fecha_validacion is not None:
        ficha.fecha_validacion = fecha_validacion
    if notas is not None:
        ficha.notas = notas
    sesion.flush()
    return ficha


def obtener_ficha_vigente(sesion: Session, grupo: GrupoCalibracion) -> FichaParametro | None:
    return sesion.scalar(select(FichaParametro).where(FichaParametro.grupo_calibracion_id == grupo.id))
