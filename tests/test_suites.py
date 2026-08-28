from laser_toolkit.config import SuiteConfig
from laser_toolkit.suites.cut import generar_suite_corte
from laser_toolkit.suites.engrave import generar_suite_grabado


def _config(operacion: str) -> SuiteConfig:
    return SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": operacion,
            "velocidades_mm_min": [200, 220],
            "potencias_pct": [80, 100],
            "fecha": "2026-08-28",
        }
    )


def test_suite_corte_genera_una_fila_csv_por_celda():
    gcode, filas = generar_suite_corte(_config("corte"))
    assert len(filas) == 4  # 2 velocidades x 2 potencias
    assert all("tiempo_estimado_celda_s" in fila for fila in filas)
    assert gcode[0].startswith(";")
    assert gcode[-2] == "M5 ; laser apagado"


def test_suite_grabado_genera_una_fila_csv_por_celda():
    gcode, filas = generar_suite_grabado(_config("grabado"))
    assert len(filas) == 4
    assert all(fila["operacion"] == "grabado" for fila in filas)
    assert gcode[-1] == "G0 X0 Y0 ; volver al origen"


def test_ids_de_filas_csv_coinciden_con_prefijo_de_operacion():
    _, filas_corte = generar_suite_corte(_config("corte"))
    _, filas_grabado = generar_suite_grabado(_config("grabado"))
    assert all(fila["id_prueba"].startswith("C-") for fila in filas_corte)
    assert all(fila["id_prueba"].startswith("C-") for fila in filas_grabado)  # prefijo por defecto es "C"
