"""Generación de G-code (#50): reemplaza `execFile("uv", ["run", ...,
"laser-toolkit", "generate-cut"/"generate-engrave", ...])` en
`generar-suite.ts` (el hallazgo documentado en #47 -- ese subproceso no
sobrevive en Vercel, sin binario `uv` ni filesystem persistente) por llamadas
directas a `laser_toolkit.suites.cut`/`engrave`, corriendo en el mismo
proceso Python de este servicio.

El G-code NUNCA se devuelve inline en la respuesta (límite ~4.5MB de Vercel
Hobby, decisión ya tomada en #2) -- se sube a Supabase Storage (#25) y se
devuelve solo la key.

Alcance actual: solo la grilla genérica velocidad×potencia (sin `svg_path` --
grabar/cortar un SVG cargado es alcance de #3, todavía no tiene forma de
llegarle un SVG real a este servicio). Persistir la suite/registro en la base
de datos (`crear_suite`, `registrar_mediciones_generadas`) es #56, que
consume el resultado de `generar()` en vez de reimplementar la generación.
"""

from __future__ import annotations

from laser_toolkit.config import FinalRunConfig, Operacion, SuiteConfig
from laser_toolkit.naming import nombre_base
from laser_toolkit.storage.operaciones import subir_gcode
from laser_toolkit.suites.cut import generar_suite_corte
from laser_toolkit.suites.engrave import generar_suite_grabado
from laser_toolkit.suites.final_run import generar_final_run as _generar_final_run

from storage_cliente import cliente as _cliente_storage


def generar(payload: dict) -> dict:
    """Espejo de `generarSuite`/`escribirYGenerar` en `generar-suite.ts`, pero
    sin pasar por un YAML en disco ni un subproceso: `payload` trae
    directamente los mismos campos que antes armaba `camposConocidos()`
    (nombres snake_case, ya compatibles 1:1 con `SuiteConfig`)."""
    if payload.get("svg_path"):
        raise ValueError(
            "Generar una suite a partir de un SVG todavía no está soportado por este servicio (issue #3)."
        )

    config = SuiteConfig(**payload)
    if config.operacion is Operacion.CORTE:
        gcode, filas = generar_suite_corte(config)
    else:
        gcode, filas = generar_suite_grabado(config)

    corrida_id = nombre_base(config)
    contenido = ("\n".join(gcode) + "\n").encode("utf-8")
    gcode_storage_key = subir_gcode(_cliente_storage, config.material, corrida_id, contenido)

    return {
        "ok": True,
        "corridaId": corrida_id,
        "gcodeStorageKey": gcode_storage_key,
        "celdas": len(filas),
        "filas": filas,
    }


def generar_final_run(payload: dict) -> dict:
    """Espejo de `generar()` de arriba, pero para una ejecución de Final Run
    (E, issue #64) -- `laser_toolkit.suites.final_run.generar_final_run` en
    vez de `suites.cut`/`.engrave`. `payload` ya trae `ejecucion` (a
    diferencia de `SuiteConfig`, `FinalRunConfig` sí modela ese campo)."""
    config = FinalRunConfig(**payload)
    gcode, filas = _generar_final_run(config)

    corrida_id = filas[0]["corrida_id"]
    contenido = ("\n".join(gcode) + "\n").encode("utf-8")
    gcode_storage_key = subir_gcode(_cliente_storage, config.material, corrida_id, contenido)

    return {
        "ok": True,
        "corridaId": corrida_id,
        "gcodeStorageKey": gcode_storage_key,
        "celdas": len(filas),
        "filas": filas,
    }


__all__ = ["generar", "generar_final_run"]
