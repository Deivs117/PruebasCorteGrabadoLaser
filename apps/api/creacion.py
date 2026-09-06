"""Crear/editar una suite de punta a punta: genera el G-code (#50) y
persiste Suite/Registro/Mediciones en Supabase (#24) en la misma operación —
reemplaza por completo `generarSuite()`/`actualizarSuite()`/
`escribirYGenerar()` en `generar-suite.ts`, que hacían `execFile("uv", ...)`
+ escribían un YAML local (el hallazgo documentado en #47).

`crear()` es #56. `actualizar()` es B/#62: mismo motor de generación, pero
mutando la Suite/Registro existentes en vez de crear filas nuevas -- con el
mismo guard que tenía `actualizarSuite`/`corridaYaRegistrada` en el sistema
de archivos (ahora sobre datos reales, no sobre la existencia de un
`_registro.csv`): si el Registro ya tiene evaluación/medición/costeo
cargado, la edición se rechaza (usar "Duplicar" con otro lote en cambio).
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import SuiteConfig
from laser_toolkit.db.models import FamiliaMaterial, Material, Suite
from laser_toolkit.db.repo_pruebas import (
    actualizar_registro,
    actualizar_suite,
    crear_registro_de_suite,
    crear_suite,
    guardar_gcode_key,
    reemplazar_mediciones,
    registrar_mediciones_generadas,
    tiene_datos_cargados,
)
from laser_toolkit.storage.operaciones import eliminar as eliminar_de_storage
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import Client

import generacion


def _familia_del_material(sesion: Session, nombre: str) -> FamiliaMaterial:
    """La familia se elige a mano al agregar el material al catálogo (#49) --
    si todavía no está ahí (se creó implícito al armar una suite, mismo caso
    que ya cubrían las suites basadas en YAML), queda "otro" hasta que
    alguien la elija explícito -- mismo criterio que `unirSinDuplicados`
    tenía del lado de TS antes de esta migración."""
    material = sesion.scalar(select(Material).where(Material.nombre == nombre))
    return material.familia if material is not None else FamiliaMaterial.OTRO


def crear(sesion: Session, payload: dict) -> dict:
    """Espejo de `generarSuite` en `generar-suite.ts`: valida, genera el
    G-code (sube a Storage) y persiste Suite+Registro+Mediciones, todo en la
    misma llamada -- una suite sin su G-code generado no sirve de nada."""
    config = SuiteConfig(**payload)
    resultado_generacion = generacion.generar(payload)

    familia = _familia_del_material(sesion, config.material)
    fecha = date.fromisoformat(config.fecha) if config.fecha else date.today()

    suite = crear_suite(
        sesion,
        material=config.material,
        familia=familia,
        espesor_mm=config.espesor_mm,
        operacion=config.operacion,
        velocidades_mm_min=config.velocidades_mm_min,
        potencias_pct=config.potencias_pct,
        lote=config.lote,
        fecha=fecha,
        pasadas=config.pasadas,
        z_step_mm=config.z_step_mm,
        tamano_celda_mm=config.tamano_celda_mm,
        espaciado_mm=config.espaciado_mm,
        id_prefijo=config.id_prefijo,
    )
    registro = crear_registro_de_suite(
        sesion, suite, corrida_id=resultado_generacion["corridaId"], fecha=fecha, lote=config.lote
    )
    registrar_mediciones_generadas(sesion, registro, resultado_generacion["filas"])
    guardar_gcode_key(sesion, registro, resultado_generacion["gcodeStorageKey"])
    sesion.commit()

    return {
        "ok": True,
        "corridaId": registro.corrida_id,
        "gcodeStorageKey": registro.gcode_storage_key,
        "celdas": resultado_generacion["celdas"],
        "suiteId": suite.id,
        "registroId": registro.id,
    }


def actualizar(sesion: Session, cliente_storage: Client, suite_id: int, payload: dict) -> dict:
    """Espejo de `actualizarSuite` en `generar-suite.ts`: regenera el G-code
    y actualiza la Suite/Registro existentes, sin crear filas nuevas.

    El G-code viejo en Storage se borra recién después de confirmar (commit)
    que la base quedó consistente con la key nueva -- nunca al revés, para
    no perder el único G-code real de la suite si algo falla en el medio."""
    suite = sesion.get(Suite, suite_id)
    if suite is None:
        raise ValueError(f"No existe la suite {suite_id}.")
    registro = suite.registros[0] if suite.registros else None
    if registro is None:
        raise ValueError(f"La suite {suite_id} no tiene un Registro asociado -- estado inconsistente.")
    if tiene_datos_cargados(registro):
        raise ValueError(
            "Esta suite ya tiene evaluación, medición de corrida o costeo cargado en su Hoja de "
            'Registro -- guardar esta edición pisaría esos datos en silencio. Usá "Duplicar" con un '
            "lote distinto en vez de editar esta suite."
        )

    config = SuiteConfig(**payload)
    resultado_generacion = generacion.generar(payload)

    familia = _familia_del_material(sesion, config.material)
    fecha = date.fromisoformat(config.fecha) if config.fecha else date.today()
    gcode_key_anterior = registro.gcode_storage_key

    actualizar_suite(
        sesion,
        suite,
        material=config.material,
        familia=familia,
        espesor_mm=config.espesor_mm,
        operacion=config.operacion,
        velocidades_mm_min=config.velocidades_mm_min,
        potencias_pct=config.potencias_pct,
        lote=config.lote,
        fecha=fecha,
        pasadas=config.pasadas,
        z_step_mm=config.z_step_mm,
        tamano_celda_mm=config.tamano_celda_mm,
        espaciado_mm=config.espaciado_mm,
        id_prefijo=config.id_prefijo,
    )
    actualizar_registro(
        sesion, registro, corrida_id=resultado_generacion["corridaId"], fecha=fecha, lote=config.lote
    )
    reemplazar_mediciones(sesion, registro, resultado_generacion["filas"])
    guardar_gcode_key(sesion, registro, resultado_generacion["gcodeStorageKey"])
    sesion.commit()

    if gcode_key_anterior and gcode_key_anterior != registro.gcode_storage_key:
        eliminar_de_storage(cliente_storage, "gcode", gcode_key_anterior)

    return {
        "ok": True,
        "corridaId": registro.corrida_id,
        "gcodeStorageKey": registro.gcode_storage_key,
        "celdas": resultado_generacion["celdas"],
        "suiteId": suite.id,
        "registroId": registro.id,
    }


__all__ = ["actualizar", "crear"]
