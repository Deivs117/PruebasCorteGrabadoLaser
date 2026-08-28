"""Lectura y escritura de los csv del sistema: el csv hermano de cada suite
(Plan Maestro, seccion 3.3) y, en general, cualquier csv con un encabezado fijo.
"""

from __future__ import annotations

import csv
from pathlib import Path

# Columnas que produce automaticamente una suite (generate-cut / generate-engrave):
# ninguna requiere medicion manual, se derivan todas de la configuracion.
CAMPOS_CSV = [
    "corrida_id",
    "id_prueba",
    "lote",
    "fecha",
    "material",
    "espesor_mm",
    "operacion",
    "velocidad_mm_min",
    "potencia_pct",
    "pasadas",
    "x_mm",
    "y_mm",
    "tamano_celda_mm",
    "area_material_mm2",
    "tiempo_estimado_celda_s",
]


def escribir_csv_columnas(filas: list[dict], columnas: list[str], destino: str | Path) -> None:
    """Escribe `filas` como csv en `destino`, usando exactamente `columnas` como
    encabezado y orden de columnas."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    with destino.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=columnas)
        escritor.writeheader()
        escritor.writerows(filas)


def escribir_csv(filas: list[dict], destino: str | Path) -> None:
    """Escribe `filas` como csv en `destino`, con el encabezado estandar de `CAMPOS_CSV`."""
    escribir_csv_columnas(filas, CAMPOS_CSV, destino)


def leer_csv(ruta: str | Path) -> list[dict[str, str]]:
    """Lee un csv como lista de filas (todos los valores como texto, tal como
    los deja `csv.DictReader`; convertir tipos queda a cargo de quien consuma)."""
    with Path(ruta).open(encoding="utf-8", newline="") as archivo:
        return list(csv.DictReader(archivo))
