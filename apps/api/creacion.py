"""Crear una suite de punta a punta (#56): genera el G-code (#50) y persiste
Suite/Registro/Mediciones en Supabase (#24) en la misma operación —
reemplaza por completo `generarSuite()`/`escribirYGenerar()` en
`generar-suite.ts`, que hoy hace `execFile("uv", ...)` + escribe un YAML
local (el hallazgo documentado en #47).

Alcance actual: solo CREAR (espejo de `generarSuite`). Editar una suite
existente (`actualizarSuite` en TS, con su chequeo de "ya tiene Hoja de
Registro preparada") y completar evaluación/costeo de una corrida quedaron
fuera -- ver #60.
"""

from __future__ import annotations

from datetime import date

import generacion
from laser_toolkit.config import SuiteConfig
from laser_toolkit.db.models import FamiliaMaterial, Material
from laser_toolkit.db.repo_pruebas import (
    crear_registro_de_suite,
    crear_suite,
    guardar_gcode_key,
    registrar_mediciones_generadas,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


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


__all__ = ["crear"]
