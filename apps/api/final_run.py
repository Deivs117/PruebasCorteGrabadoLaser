"""Final Run / Calibración (E, issue #64): una combinación fija de
parámetros de producción, repetida en ejecuciones independientes, hasta
calibrar su energía/tiempo real (Plan Maestro, sección 8) -- mismo patrón
de punta a punta que `creacion.py` (#56/#62) para Suite, pero orquestando
`GrupoCalibracion`/`FinalRun` en vez de `Suite`.

Sin dependencia de FastAPI a propósito (mismo patrón que el resto de
`apps/api`): funciones que levantan `ValueError` en errores de negocio,
`main.py` las traduce a HTTP.
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import FinalRunConfig
from laser_toolkit.db.models import (
    CandidatoFinalRun,
    EstadoFicha,
    FamiliaMaterial,
    GrupoCalibracion,
    Material,
)
from laser_toolkit.db.repo_calibracion import (
    crear_final_run,
    crear_o_actualizar_ficha,
    obtener_o_crear_grupo_calibracion,
)
from laser_toolkit.db.repo_pruebas import (
    crear_registro_de_final_run,
    guardar_gcode_key,
    registrar_mediciones_generadas,
)
from laser_toolkit.storage.operaciones import eliminar as eliminar_de_storage
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import Client

import generacion


def _familia_del_material(sesion: Session, nombre: str) -> FamiliaMaterial:
    """Igual que en `creacion.py`: la familia se elige a mano al agregar el
    material al catálogo -- si todavía no está ahí, queda "otro" hasta que
    alguien la elija explícito."""
    material = sesion.scalar(select(Material).where(Material.nombre == nombre))
    return material.familia if material is not None else FamiliaMaterial.OTRO


def _grupo_por_id(sesion: Session, grupo_calibracion_id: str) -> GrupoCalibracion:
    grupo = sesion.scalar(
        select(GrupoCalibracion).where(GrupoCalibracion.grupo_calibracion_id == grupo_calibracion_id)
    )
    if grupo is None:
        raise ValueError(f"No existe el grupo de calibración {grupo_calibracion_id}.")
    return grupo


def crear_ejecucion(sesion: Session, payload: dict) -> dict:
    """Genera el G-code de una nueva ejecución y persiste Grupo (resuelto o
    creado)/FinalRun/Registro/Mediciones en la misma operación -- espejo de
    `creacion.crear()` (#56).

    El número de ejecución se calcula solo (siguiente libre del grupo,
    empezando en 1) en vez de pedirse en el formulario: da igual si el
    grupo es nuevo o ya tenía ejecuciones -- "Nueva Final Run" y "Generar
    ejecución N+1" (`generar_siguiente_ejecucion`) terminan usando esta
    misma función."""
    config = FinalRunConfig(**payload)
    familia = _familia_del_material(sesion, config.material)
    grupo = obtener_o_crear_grupo_calibracion(
        sesion,
        material=config.material,
        familia=familia,
        espesor_mm=config.espesor_mm,
        operacion=config.operacion,
        velocidad_mm_min=config.velocidad_mm_min,
        potencia_pct=config.potencia_pct,
    )
    siguiente = max((fr.ejecucion for fr in grupo.final_runs), default=0) + 1

    resultado_generacion = generacion.generar_final_run({**payload, "ejecucion": siguiente})

    fecha = date.fromisoformat(config.fecha) if config.fecha else date.today()
    final_run = crear_final_run(
        sesion,
        grupo,
        ejecucion=siguiente,
        lote=config.lote,
        fecha=fecha,
        repeticiones=config.repeticiones,
        pasadas=config.pasadas,
        z_step_mm=config.z_step_mm,
        tamano_celda_mm=config.tamano_celda_mm,
        espaciado_mm=config.espaciado_mm,
        id_prefijo=config.id_prefijo,
    )
    registro = crear_registro_de_final_run(
        sesion, final_run, corrida_id=resultado_generacion["corridaId"], fecha=fecha, lote=config.lote
    )
    registrar_mediciones_generadas(sesion, registro, resultado_generacion["filas"])
    guardar_gcode_key(sesion, registro, resultado_generacion["gcodeStorageKey"])
    sesion.commit()

    return {
        "ok": True,
        "grupoId": grupo.grupo_calibracion_id,
        "corridaId": registro.corrida_id,
        "ejecucion": siguiente,
        "gcodeStorageKey": registro.gcode_storage_key,
        "celdas": resultado_generacion["celdas"],
    }


def generar_siguiente_ejecucion(sesion: Session, grupo_calibracion_id: str) -> dict:
    """Repite exactamente los mismos parámetros de la última ejecución del
    grupo -- el punto de una Final Run es repetir la combinación ya
    fijada, no volver a elegirla (espejo de `GenerarEjecucionButton`, que no
    junta ningún dato de formulario)."""
    grupo = _grupo_por_id(sesion, grupo_calibracion_id)
    if not grupo.final_runs:
        raise ValueError(f"El grupo {grupo_calibracion_id} todavía no tiene ninguna ejecución.")
    ultimo = max(grupo.final_runs, key=lambda fr: fr.ejecucion)
    payload = {
        "material": grupo.material.nombre,
        "espesor_mm": grupo.espesor_mm,
        "operacion": grupo.operacion.value,
        "velocidad_mm_min": grupo.velocidad_mm_min,
        "potencia_pct": grupo.potencia_pct,
        "pasadas": ultimo.pasadas,
        "repeticiones": ultimo.repeticiones,
        "z_step_mm": ultimo.z_step_mm,
        "tamano_celda_mm": ultimo.tamano_celda_mm,
        "espaciado_mm": ultimo.espaciado_mm,
        "id_prefijo": ultimo.id_prefijo,
        "lote": ultimo.lote,
    }
    return crear_ejecucion(sesion, payload)


def actualizar_ficha(
    sesion: Session,
    grupo_calibracion_id: str,
    *,
    estado: str,
    notas: str | None = None,
    costo_estandar_total: float | None = None,
    fecha_validacion: date | None = None,
) -> dict:
    """Crea o actualiza la Ficha de Parámetro (F6, issue #7) de un grupo --
    espejo de `crear_o_actualizar_ficha`. No exige que el grupo esté
    calibrado (`resumen_calibracion`) para marcarlo `oficial`: esa
    decisión es del área de calidad del taller, no una regla que este
    servicio deba imponer.

    Un solo endpoint cubre tanto el toggle rápido de Final Run ("Marcar
    Ficha como oficial", solo `estado`) como el editor completo de la
    pantalla Fichas de Parámetro (#7, que además carga costo y fecha) --
    `costo_estandar_total`/`fecha_validacion` en `None` simplemente no
    tocan el valor ya guardado (ver `crear_o_actualizar_ficha`)."""
    grupo = _grupo_por_id(sesion, grupo_calibracion_id)
    try:
        estado_enum = EstadoFicha(estado)
    except ValueError as error:
        raise ValueError(f"Estado de ficha inválido: '{estado}'.") from error
    ficha = crear_o_actualizar_ficha(
        sesion,
        grupo,
        estado=estado_enum,
        notas=notas,
        costo_estandar_total=costo_estandar_total,
        fecha_validacion=fecha_validacion,
    )
    sesion.commit()
    return {
        "estado": ficha.estado.value,
        "notas": ficha.notas or "",
        "costoEstandarTotal": (str(ficha.costo_estandar_total) if ficha.costo_estandar_total is not None else ""),
        "fechaValidacion": (ficha.fecha_validacion.isoformat() if ficha.fecha_validacion is not None else ""),
    }


def eliminar_grupo(sesion: Session, cliente_storage: Client, grupo_calibracion_id: str) -> None:
    """Borra todas las ejecuciones del grupo (Registro/Mediciones/Candidatos,
    fotos y `.gcode` en Storage) más su Ficha de Parámetro si tiene, y el
    grupo mismo -- espejo de `eliminarGrupoCalibracion` en `final-run-data.ts`,
    pero real: acá sí hay filas de verdad detrás, no solo archivos sueltos."""
    grupo = _grupo_por_id(sesion, grupo_calibracion_id)

    for final_run in grupo.final_runs:
        for registro in final_run.registros:
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
        sesion.delete(final_run)

    if grupo.ficha_parametro is not None:
        sesion.delete(grupo.ficha_parametro)

    sesion.delete(grupo)
    sesion.commit()


__all__ = [
    "actualizar_ficha",
    "crear_ejecucion",
    "eliminar_grupo",
    "generar_siguiente_ejecucion",
]
