from __future__ import annotations

from laser_toolkit.storage.rutas import ruta_foto, ruta_gcode, ruta_svg, ruta_svg_biblioteca


def test_ruta_gcode_usa_slug_de_material_y_corrida_id():
    assert (
        ruta_gcode("MDF Trupan", "MDF-Trupan_3mm_corte_2026-09-03_L07")
        == "MDF-Trupan/MDF-Trupan_3mm_corte_2026-09-03_L07.gcode"
    )


def test_ruta_svg_usa_id_de_suite_no_nombre_original():
    assert ruta_svg("MDF Comercial", 42) == "MDF-Comercial/suite-42.svg"


def test_ruta_foto_anida_por_corrida():
    assert (
        ruta_foto("MDF Trupan", "MDF-Trupan_3mm_corte_2026-09-03_L07", "C-001")
        == "MDF-Trupan/MDF-Trupan_3mm_corte_2026-09-03_L07/C-001.jpg"
    )


def test_material_con_espacios_multiples_se_normaliza_igual_que_naming():
    # Mismo slug que ya usa laser_toolkit.naming para nombres de archivo --
    # no debería divergir entre las dos rutas de codigo.
    assert ruta_gcode("MDF   Trupan", "X") == "MDF-Trupan/X.gcode"


def test_ruta_svg_biblioteca_no_depende_de_material():
    assert ruta_svg_biblioteca("logo-flux-mtqd4ks6.svg") == "biblioteca/logo-flux-mtqd4ks6.svg"
