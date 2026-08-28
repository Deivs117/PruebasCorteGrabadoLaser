"""Escritura del csv hermano de cada suite: una fila por celda, con las columnas
que la Hoja de Registro espera importar directamente (Plan Maestro, seccion 5).
"""

from __future__ import annotations

import csv
from pathlib import Path

CAMPOS_CSV = [
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
    "tiempo_estimado_celda_s",
]


def escribir_csv(filas: list[dict], destino: str | Path) -> None:
    """Escribe `filas` como csv en `destino`, con el encabezado estandar de `CAMPOS_CSV`."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    with destino.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS_CSV)
        escritor.writeheader()
        escritor.writerows(filas)
