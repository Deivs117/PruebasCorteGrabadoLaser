from pathlib import Path

from laser_toolkit.tarifas import TarifasConfig, clave_material


def test_clave_material_formatea_espesor_sin_decimales_innecesarios():
    assert clave_material("MDF Trupan", 3.0) == "MDF Trupan_3mm"
    assert clave_material("MDF Trupan", 4.5) == "MDF Trupan_4.5mm"


def test_tarifas_por_defecto_quedan_pendientes():
    tarifas = TarifasConfig()
    assert tarifas.tarifa_electrica_por_kwh is None
    assert tarifas.tarifa_hora_maquina is None
    assert tarifas.precio_material_por_m2 == {}


def test_from_yaml_carga_valores_definidos(tmp_path: Path):
    contenido = """
moneda: "COP"
tarifa_electrica_por_kwh: 800
tarifa_hora_maquina: 5000
precio_material_por_m2:
  "MDF Trupan_3mm": 25000
"""
    ruta = tmp_path / "tarifas.yaml"
    ruta.write_text(contenido, encoding="utf-8")

    tarifas = TarifasConfig.from_yaml(ruta)

    assert tarifas.moneda == "COP"
    assert tarifas.tarifa_electrica_por_kwh == 800
    assert tarifas.precio_material_por_m2["MDF Trupan_3mm"] == 25000


def test_from_yaml_con_nulls_deja_pendiente(tmp_path: Path):
    ruta = tmp_path / "tarifas.yaml"
    ruta.write_text("tarifa_electrica_por_kwh: null\n", encoding="utf-8")

    tarifas = TarifasConfig.from_yaml(ruta)

    assert tarifas.tarifa_electrica_por_kwh is None


def test_from_yaml_permite_material_sin_precio_todavia(tmp_path: Path):
    """Regresion: la plantilla real trae materiales identificados pero sin
    precio aun (null) mezclados con otros ya cotizados; no debe fallar."""
    contenido = """
precio_material_por_m2:
  "MDF Trupan_3mm": 28000
  "MDF Trupan_5mm": null
"""
    ruta = tmp_path / "tarifas.yaml"
    ruta.write_text(contenido, encoding="utf-8")

    tarifas = TarifasConfig.from_yaml(ruta)

    assert tarifas.precio_material_por_m2["MDF Trupan_3mm"] == 28000
    assert tarifas.precio_material_por_m2["MDF Trupan_5mm"] is None
