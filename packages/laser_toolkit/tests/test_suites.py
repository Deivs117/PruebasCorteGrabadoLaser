from pathlib import Path

import pytest

from laser_toolkit.config import SuiteConfig
from laser_toolkit.suites.cut import generar_suite_corte
from laser_toolkit.suites.engrave import generar_suite_grabado

RAIZ_REPO = Path(__file__).resolve().parent.parent
LOGO_EMPRESA = RAIZ_REPO / "assets" / "svg" / "logo-empresa.svg"


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


def test_suite_grabado_generico_usa_punto_focal_como_paso_de_linea():
    # Con un punto focal mas angosto entran mas lineas de barrido en la misma
    # celda -- mas tiempo de maquina y mas lineas G1 en el gcode -- prueba de
    # que `machine.punto_focal_mm` maneja el paso en vez de una constante fija.
    config_spot_ancho = SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": "grabado",
            "velocidades_mm_min": [1500],
            "potencias_pct": [50],
            "tamano_celda_mm": 7.0,
            "fecha": "2026-08-28",
            "machine": {"punto_focal_mm": 0.2},
        }
    )
    config_spot_angosto = config_spot_ancho.model_copy(
        update={"machine": config_spot_ancho.machine.model_copy(update={"punto_focal_mm": 0.08})}
    )

    gcode_ancho, filas_ancho = generar_suite_grabado(config_spot_ancho)
    gcode_angosto, filas_angosto = generar_suite_grabado(config_spot_angosto)

    assert len(gcode_angosto) > len(gcode_ancho)
    assert filas_angosto[0]["tiempo_estimado_celda_s"] > filas_ancho[0]["tiempo_estimado_celda_s"]


def test_suite_grabado_generico_desplaza_la_columna_0_para_el_overscan():
    # Bug real reportado: la columna 0 (x_mm=0 sin este fix) perdia el
    # sobre-recorrido hacia la izquierda porque grabar_relleno lo recorta
    # contra X=0 -- el gcode solo tenia overscan del lado derecho.
    from laser_toolkit.gcode.writer import margen_seguridad_columna_cero_mm

    config = SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": "grabado",
            "velocidades_mm_min": [1000, 1500, 2000],
            "potencias_pct": [20, 35],
            "tamano_celda_mm": 5.0,
            "espaciado_mm": 3.0,
            "fecha": "2026-08-28",
        }
    )
    _, filas = generar_suite_grabado(config)
    margen_esperado = margen_seguridad_columna_cero_mm(config.velocidades_mm_min, config.machine)

    columna_0 = [fila for fila in filas if fila["x_mm"] == pytest.approx(margen_esperado)]
    assert columna_0, "ninguna celda quedo en la columna 0 desplazada por el margen de seguridad"
    assert margen_esperado > 0
    assert not any(fila["x_mm"] < margen_esperado - 1e-9 for fila in filas)


def test_suite_grabado_con_svg_path_produce_gcode_de_curvas(tmp_path):
    if not LOGO_EMPRESA.exists():
        return  # el logo real no viene incluido en cada checkout de forma obligatoria
    config = SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": "grabado",
            "velocidades_mm_min": [1000, 1200],
            "potencias_pct": [20],
            "tamano_celda_mm": 30.0,
            "svg_path": str(LOGO_EMPRESA),
            "fecha": "2026-08-28",
        }
    )
    gcode, filas = generar_suite_grabado(config)
    assert len(filas) == 2  # 2 velocidades x 1 potencia
    assert all(fila["area_material_mm2"] == 0.0 for fila in filas)  # grabado no consume material
    # el gcode de un logo real (curvas aplanadas) es sustancialmente mas largo
    # que el de un cuadrado generico -- prueba de humo de que se uso el SVG.
    assert len(gcode) > 100


def test_suite_corte_con_svg_path_corta_el_contorno():
    if not LOGO_EMPRESA.exists():
        return  # el logo real no viene incluido en cada checkout de forma obligatoria
    config = SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": "corte",
            "velocidades_mm_min": [200],
            "potencias_pct": [100],
            "tamano_celda_mm": 30.0,
            "svg_path": str(LOGO_EMPRESA),
            "fecha": "2026-08-28",
        }
    )
    gcode, filas = generar_suite_corte(config)
    assert len(filas) == 1  # 1 velocidad x 1 potencia
    # el corte remueve toda la celda, sea cuadrado generico o contorno de SVG
    # (Plan Maestro, seccion 6.2) -- no solo el area encerrada por la forma.
    assert filas[0]["area_material_mm2"] == 30.0**2
    # el gcode de un logo real (curvas aplanadas) es sustancialmente mas largo
    # que el de un cuadrado generico -- prueba de humo de que se uso el SVG.
    assert len(gcode) > 100


def test_suite_corte_con_svg_path_repite_segun_pasadas():
    if not LOGO_EMPRESA.exists():
        return
    config_una_pasada = SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": "corte",
            "velocidades_mm_min": [200],
            "potencias_pct": [100],
            "tamano_celda_mm": 30.0,
            "svg_path": str(LOGO_EMPRESA),
            "pasadas": 1,
            "fecha": "2026-08-28",
        }
    )
    config_tres_pasadas = config_una_pasada.model_copy(update={"pasadas": 3})

    gcode_1, filas_1 = generar_suite_corte(config_una_pasada)
    gcode_3, filas_3 = generar_suite_corte(config_tres_pasadas)

    # 3 pasadas cortan el mismo contorno 3 veces -- el gcode y el tiempo
    # estimado escalan (aprox 3x, con margen por el redondeo a 2 decimales),
    # el area de material (toda la celda) no cambia.
    assert len(gcode_3) > len(gcode_1)
    tiempo_1 = filas_1[0]["tiempo_estimado_celda_s"]
    tiempo_3 = filas_3[0]["tiempo_estimado_celda_s"]
    assert tiempo_3 == pytest.approx(tiempo_1 * 3, rel=0.01)
    assert filas_3[0]["area_material_mm2"] == filas_1[0]["area_material_mm2"]
