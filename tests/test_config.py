from pathlib import Path

import pytest
from pydantic import ValidationError

from laser_toolkit.config import Operacion, SuiteConfig


def _config_base(**overrides: object) -> dict:
    base = {
        "material": "MDF Trupan",
        "espesor_mm": 3.0,
        "operacion": "corte",
        "velocidades_mm_min": [200, 220, 240],
        "potencias_pct": [80, 100],
    }
    base.update(overrides)
    return base


def test_carga_configuracion_minima_valida():
    config = SuiteConfig.model_validate(_config_base())
    assert config.operacion is Operacion.CORTE
    assert config.pasadas == 1
    assert config.machine.laser_max_s == 10000


def test_potencia_fuera_de_rango_falla():
    with pytest.raises(ValidationError):
        SuiteConfig.model_validate(_config_base(potencias_pct=[0, 150]))


def test_velocidad_no_positiva_falla():
    with pytest.raises(ValidationError):
        SuiteConfig.model_validate(_config_base(velocidades_mm_min=[0, 200]))


def test_svg_path_en_corte_es_valido():
    # Cortar el contorno de un SVG es una operacion valida (ver
    # suites/cut.py): a diferencia de grabado, corte ignora modo_grabado_svg
    # y siempre traza solo el contorno.
    config = SuiteConfig.model_validate(
        _config_base(operacion="corte", svg_path="assets/svg/logo-empresa.svg")
    )
    assert config.svg_path == "assets/svg/logo-empresa.svg"


def test_svg_path_en_grabado_es_valido():
    config = SuiteConfig.model_validate(
        _config_base(operacion="grabado", velocidades_mm_min=[1000], svg_path="assets/svg/logo-empresa.svg")
    )
    assert config.svg_path == "assets/svg/logo-empresa.svg"


def test_from_yaml_roundtrip(tmp_path: Path):
    contenido = """
material: "MDF Trupan"
espesor_mm: 3.0
operacion: grabado
velocidades_mm_min: [1000, 1200]
potencias_pct: [20, 30]
"""
    ruta = tmp_path / "config.yaml"
    ruta.write_text(contenido, encoding="utf-8")

    config = SuiteConfig.from_yaml(ruta)

    assert config.operacion is Operacion.GRABADO
    assert config.velocidades_mm_min == [1000, 1200]
