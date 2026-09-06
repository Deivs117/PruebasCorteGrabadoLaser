#!/usr/bin/env python3
"""Migración one-shot de `data/`/`configs/` a Supabase (issue #26).

Corre UNA vez sobre los datos reales ya limpiados (ver commit `92ea97b`,
issue #26 en el tracker). Es intencionalmente idempotente: si un
`corrida_id` ya existe en `registros`, esa corrida se saltea en vez de
duplicarse -- correr el script dos veces por error no rompe nada.

Para cada corrida, se intenta encontrar la config YAML que la generó
(todavía viva en `configs/`, matcheando por `nombre_base` con la fecha del
registro) para reconstruir la `Suite` con fidelidad completa (incluyendo
`svg_path` -> se sube el SVG real a Storage). Si la config ya no existe en
disco (pasa con corridas viejas cuya config se borró después de generarla),
la `Suite` se reconstruye a partir de las propias filas del csv -- pierde
`svg_path`/`modo_grabado_svg` (esa info no vive en el csv), pero preserva
lo que sí importa para costeo/calibración: velocidades, potencias, y toda
la evaluación manual.

Uso:
    uv run --project packages/laser_toolkit python packages/laser_toolkit/scripts/migrar_datos_legacy.py [--dry-run]
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "packages/laser_toolkit/src"))

from laser_toolkit.config import Operacion, SuiteConfig  # noqa: E402
from laser_toolkit.db.base import crear_engine, crear_fabrica_sesiones  # noqa: E402
from laser_toolkit.db.models import CandidatoFinalRun, FamiliaMaterial, Registro  # noqa: E402
from laser_toolkit.db.repo_pruebas import (  # noqa: E402
    completar_evaluacion,
    completar_medicion_corrida,
    crear_registro_de_suite,
    crear_suite,
    guardar_gcode_key,
    marcar_candidato,
    registrar_mediciones_generadas,
)
from laser_toolkit.naming import nombre_base  # noqa: E402
from laser_toolkit.storage.client import crear_cliente_storage  # noqa: E402
from laser_toolkit.storage.operaciones import subir_gcode, subir_svg  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

DATA_DIR = REPO_ROOT / "data"
CONFIGS_DIR = REPO_ROOT / "configs"


def _leer_catalogo_familias() -> dict[str, FamiliaMaterial]:
    catalogo = json.loads((DATA_DIR / "materiales-catalog.json").read_text())
    return {m["nombre"]: FamiliaMaterial(m["familia"]) for m in catalogo}


def _familia_de(nombre_material: str, catalogo: dict[str, FamiliaMaterial]) -> FamiliaMaterial:
    return catalogo.get(nombre_material, FamiliaMaterial.OTRO)


def _buscar_config_viva(corrida_id: str, fecha_iso: str) -> SuiteConfig | None:
    """Busca en `configs/*.yaml` la SuiteConfig (no FinalRunConfig) que,
    generada en `fecha_iso`, produce exactamente `corrida_id` -- mismo
    criterio de nombrado que usa el propio CLI (`naming.nombre_base`)."""
    for archivo in CONFIGS_DIR.glob("*.yaml"):
        if "tarifas" in archivo.name:
            continue
        try:
            config = SuiteConfig.from_yaml(archivo)
        except Exception:  # noqa: BLE001 -- puede ser un FinalRunConfig, no nos interesa acá
            continue
        candidato = config.model_copy(update={"fecha": fecha_iso})
        if nombre_base(candidato) == corrida_id:
            return config
    return None


def _reconstruir_suite_desde_csv(filas: list[dict]) -> dict:
    """Reconstruye los campos de una Suite a partir de las propias filas del
    csv, para corridas cuya config ya no existe en disco. Sin `svg_path`/
    `modo_grabado_svg` -- esa info no vive en el csv."""
    velocidades = sorted({int(f["velocidad_mm_min"]) for f in filas})
    potencias = sorted({int(f["potencia_pct"]) for f in filas})
    tamano_celda_mm = float(filas[0]["tamano_celda_mm"])

    xs = sorted({float(f["x_mm"]) for f in filas})
    if len(xs) >= 2:
        espaciado_mm = round(xs[1] - xs[0] - tamano_celda_mm, 4)
    else:
        espaciado_mm = 5.0  # default del modelo -- no hay forma de derivarlo con una sola columna

    return {
        "velocidades_mm_min": velocidades,
        "potencias_pct": potencias,
        "pasadas": int(filas[0]["pasadas"]),
        "tamano_celda_mm": tamano_celda_mm,
        "espaciado_mm": espaciado_mm,
        "id_prefijo": filas[0]["id_prueba"].split("-")[0],
    }


def _bool_o_none(valor: str) -> bool | None:
    if valor == "si":
        return True
    if valor == "no":
        return False
    return None


def _int_o_none(valor: str) -> int | None:
    return int(valor) if valor.strip() else None


def _float_o_none(valor: str) -> float | None:
    return float(valor) if valor.strip() else None


def migrar_materiales(sesion: Session, catalogo: dict[str, FamiliaMaterial]) -> int:
    from laser_toolkit.db.repo_materiales import obtener_o_crear_material

    for nombre, familia in catalogo.items():
        obtener_o_crear_material(sesion, nombre, familia)
    sesion.flush()
    return len(catalogo)


def migrar_registro(
    sesion: Session, cliente_storage, archivo_csv: Path, catalogo: dict[str, FamiliaMaterial], dry_run: bool
) -> str:
    with archivo_csv.open(encoding="utf-8", newline="") as fh:
        filas = list(csv.DictReader(fh))
    if not filas:
        return f"VACIO: {archivo_csv.name}"

    primera = filas[0]
    corrida_id = primera["corrida_id"]

    if sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id)) is not None:
        return f"YA MIGRADO (salteado): {corrida_id}"

    material = primera["material"]
    familia = _familia_de(material, catalogo)
    fecha = date.fromisoformat(primera["fecha"])
    lote = primera["lote"]

    config_viva = _buscar_config_viva(corrida_id, primera["fecha"])
    if dry_run:
        origen = "config viva" if config_viva else "reconstruido de csv"
        return f"[DRY-RUN] {corrida_id}: {len(filas)} mediciones, origen={origen}"

    if config_viva is not None:
        suite = crear_suite(
            sesion,
            material=material,
            familia=familia,
            espesor_mm=config_viva.espesor_mm,
            operacion=config_viva.operacion,
            velocidades_mm_min=config_viva.velocidades_mm_min,
            potencias_pct=config_viva.potencias_pct,
            pasadas=config_viva.pasadas,
            z_step_mm=config_viva.z_step_mm,
            tamano_celda_mm=config_viva.tamano_celda_mm,
            espaciado_mm=config_viva.espaciado_mm,
            id_prefijo=config_viva.id_prefijo,
            lote=lote,
            fecha=fecha,
            modo_grabado_svg=config_viva.modo_grabado_svg if config_viva.svg_path else None,
            svg_resolucion_relleno_mm=(config_viva.svg_resolucion_relleno_mm if config_viva.svg_path else None),
        )
        # La ruta de Storage incluye el id de la suite (ver storage/rutas.py) --
        # subir DESPUES de crear la fila, nunca antes con un id de relleno.
        if config_viva.svg_path:
            ruta_svg = REPO_ROOT / config_viva.svg_path
            suite.svg_storage_key = subir_svg(cliente_storage, material, suite.id, ruta_svg.read_bytes())
            sesion.flush()
        origen = "config viva"
    else:
        campos = _reconstruir_suite_desde_csv(filas)
        suite = crear_suite(
            sesion,
            material=material,
            familia=familia,
            espesor_mm=float(primera["espesor_mm"]),
            operacion=Operacion(primera["operacion"]),
            lote=lote,
            fecha=fecha,
            **campos,
        )
        origen = "reconstruido de csv"

    registro = crear_registro_de_suite(sesion, suite, corrida_id=corrida_id, fecha=fecha, lote=lote)

    kwh = _float_o_none(primera["kwh_corrida_medido"])
    tiempo = _float_o_none(primera["tiempo_real_corrida_s"])
    if kwh is not None and tiempo is not None:
        completar_medicion_corrida(sesion, registro, kwh_corrida_medido=kwh, tiempo_real_corrida_s=tiempo)

    mediciones = registrar_mediciones_generadas(sesion, registro, filas)
    for medicion, fila in zip(mediciones, filas, strict=True):
        completar_evaluacion(
            sesion,
            medicion,
            corte_pasante=_bool_o_none(fila["corte_pasante"]),
            carbonizacion_1a5=_int_o_none(fila["carbonizacion_1a5"]),
            notas=fila["notas"] or None,
        )

    archivo_gcode = archivo_csv.parent / f"{corrida_id}.gcode"
    if archivo_gcode.exists():
        key = subir_gcode(cliente_storage, material, corrida_id, archivo_gcode.read_bytes())
        guardar_gcode_key(sesion, registro, key)

    sesion.flush()
    return f"OK ({origen}): {corrida_id} -- {len(mediciones)} mediciones"


def migrar_candidatos(sesion: Session, dry_run: bool) -> int:
    from laser_toolkit.db.models import Medicion

    ruta = DATA_DIR / "candidatos-final-run.json"
    candidatos = json.loads(ruta.read_text())
    migrados = 0
    for candidato in candidatos:
        registro = sesion.scalar(select(Registro).where(Registro.corrida_id == candidato["corridaId"]))
        if registro is None:
            print(f"  ADVERTENCIA: candidato {candidato['id']} referencia un registro no migrado, se saltea")
            continue
        medicion = sesion.scalar(
            select(Medicion).where(
                Medicion.registro_id == registro.id, Medicion.id_prueba == candidato["idPrueba"]
            )
        )
        if medicion is None:
            print(f"  ADVERTENCIA: candidato {candidato['id']} referencia una medición inexistente, se saltea")
            continue
        if not dry_run:
            marcar_candidato(sesion, medicion)
        migrados += 1
    return migrados


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Solo reporta qué se migraría, no escribe nada.")
    args = parser.parse_args()

    catalogo = _leer_catalogo_familias()
    engine = crear_engine()
    Sesion = crear_fabrica_sesiones(engine)
    cliente_storage = None if args.dry_run else crear_cliente_storage()

    with Sesion() as sesion:
        n_materiales = 0 if args.dry_run else migrar_materiales(sesion, catalogo)
        print(f"materiales: {n_materiales}")

        print("\nregistros:")
        for archivo in sorted((DATA_DIR / "registros").glob("*_registro.csv")):
            print(" ", migrar_registro(sesion, cliente_storage, archivo, catalogo, args.dry_run))

        n_candidatos = migrar_candidatos(sesion, args.dry_run)
        print(f"\ncandidatos: {n_candidatos}")

        if args.dry_run:
            sesion.rollback()
            print("\n[DRY-RUN] nada se escribió.")
        else:
            sesion.commit()
            print("\nMigración confirmada (commit).")


if __name__ == "__main__":
    main()
