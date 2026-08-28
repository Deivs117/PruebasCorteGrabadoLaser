from laser_toolkit.config import SuiteConfig
from laser_toolkit.naming import nombre_base


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
