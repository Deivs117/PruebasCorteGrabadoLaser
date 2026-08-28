import csv

from laser_toolkit.io.csv_export import CAMPOS_CSV, escribir_csv


def test_escribir_csv_crea_encabezado_y_filas(tmp_path):
    filas = [
        {campo: "0" for campo in CAMPOS_CSV},
    ]
    destino = tmp_path / "sub" / "salida.csv"

    escribir_csv(filas, destino)

    assert destino.exists()
    with destino.open(encoding="utf-8") as archivo:
        lector = csv.DictReader(archivo)
        assert lector.fieldnames == CAMPOS_CSV
        filas_leidas = list(lector)
    assert len(filas_leidas) == 1
