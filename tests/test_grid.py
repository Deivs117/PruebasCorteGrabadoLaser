from laser_toolkit.config import SuiteConfig
from laser_toolkit.gcode.grid import construir_grilla


def _config(**overrides: object) -> SuiteConfig:
    base = {
        "material": "MDF Trupan",
        "espesor_mm": 3.0,
        "operacion": "corte",
        "velocidades_mm_min": [200, 220, 240],
        "potencias_pct": [80, 100],
        "tamano_celda_mm": 15.0,
        "espaciado_mm": 5.0,
    }
    base.update(overrides)
    return SuiteConfig.model_validate(base)


def test_cantidad_de_celdas_es_velocidades_por_potencias():
    config = _config()
    celdas = construir_grilla(config)
    assert len(celdas) == len(config.velocidades_mm_min) * len(config.potencias_pct)


def test_ids_son_secuenciales_y_con_prefijo():
    config = _config(id_prefijo="C")
    celdas = construir_grilla(config)
    ids = [c.id for c in celdas]
    assert ids == [f"C-{i:03d}" for i in range(1, len(celdas) + 1)]


def test_orden_serpenteado_invierte_columnas_en_fila_impar():
    config = _config(velocidades_mm_min=[200, 220, 240], potencias_pct=[80, 100])
    celdas = construir_grilla(config)

    fila_0 = [c for c in celdas if c.potencia_pct == 80]
    fila_1 = [c for c in celdas if c.potencia_pct == 100]

    # fila 0 (par): recorre velocidades en orden normal
    assert [c.velocidad_mm_min for c in fila_0] == [200, 220, 240]
    # fila 1 (impar): recorre velocidades en orden inverso (serpenteo)
    assert [c.velocidad_mm_min for c in fila_1] == [240, 220, 200]


def test_posiciones_xy_respetan_fila_y_columna_real_no_orden_de_recorrido():
    config = _config(velocidades_mm_min=[200, 220, 240], potencias_pct=[80, 100])
    celdas = construir_grilla(config)
    paso = config.tamano_celda_mm + config.espaciado_mm

    celda_240_fila1 = next(c for c in celdas if c.potencia_pct == 100 and c.velocidad_mm_min == 240)
    # 240 mm/min es la ultima columna (indice 2), independientemente de que la
    # fila 1 se recorra en reversa.
    assert celda_240_fila1.x_mm == 2 * paso
    assert celda_240_fila1.y_mm == 1 * paso
