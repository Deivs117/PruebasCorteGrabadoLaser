from laser_toolkit.config import FinalRunConfig, SuiteConfig
from laser_toolkit.naming import id_grupo_calibracion, nombre_base, nombre_base_final_run, slug_material


def test_slug_material_normaliza_espacios():
    assert slug_material("MDF Trupan") == "MDF-Trupan"


def test_slug_material_normaliza_barras():
    """TPU/silicona (#8): una barra sin normalizar quedaría embebida en
    corrida_id/grupo_calibracion_id, y esos IDs viajan como parámetro de
    rutas dinámicas de Next.js -- una barra ahí se interpreta como un
    segmento de ruta extra, no como parte del nombre."""
    assert slug_material("TPU/Silicona") == "TPU-Silicona"


def test_slug_material_normaliza_barras_y_espacios_mezclados():
    assert slug_material(" TPU / Silicona ") == "TPU-Silicona"


def test_nombre_base_con_fecha_fija():
    config = SuiteConfig.model_validate(
        {
            "material": "MDF Trupan",
            "espesor_mm": 3.0,
            "operacion": "corte",
            "velocidades_mm_min": [200],
            "potencias_pct": [100],
            "lote": "L01",
            "fecha": "2026-08-28",
        }
    )
    assert nombre_base(config) == "MDF-Trupan_3mm_corte_2026-08-28_L01"


def _final_run_config(**overrides: object) -> FinalRunConfig:
    base: dict = {
        "material": "MDF Trupan",
        "espesor_mm": 3.0,
        "operacion": "corte",
        "velocidad_mm_min": 260,
        "potencia_pct": 100,
        "lote": "L01",
        "fecha": "2026-08-28",
    }
    base.update(overrides)
    return FinalRunConfig.model_validate(base)


def test_id_grupo_calibracion_no_depende_de_ejecucion_ni_fecha():
    grupo_ejec1 = id_grupo_calibracion(_final_run_config(ejecucion=1, fecha="2026-08-28"))
    grupo_ejec2 = id_grupo_calibracion(_final_run_config(ejecucion=2, fecha="2026-09-01"))
    assert grupo_ejec1 == grupo_ejec2 == "MDF-Trupan_3mm_corte_260mmmin_100pct"


def test_nombre_base_final_run_incluye_ejecucion():
    nombre = nombre_base_final_run(_final_run_config(ejecucion=2, fecha="2026-08-28"))
    assert nombre == "FINAL_MDF-Trupan_3mm_corte_260mmmin_100pct_ejec2_2026-08-28_L01"
