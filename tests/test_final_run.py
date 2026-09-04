import pytest
from pydantic import ValidationError

from laser_toolkit.config import FinalRunConfig
from laser_toolkit.suites.final_run import construir_replicas, generar_final_run


def _config(**overrides: object) -> FinalRunConfig:
    base: dict = {
        "material": "MDF Trupan",
        "espesor_mm": 3.0,
        "operacion": "corte",
        "velocidad_mm_min": 260,
        "potencia_pct": 100,
        "repeticiones": 5,
        "ejecucion": 1,
        "fecha": "2026-08-28",
    }
    base.update(overrides)
    return FinalRunConfig.model_validate(base)


def test_velocidad_por_encima_del_limite_real_de_la_maquina_falla():
    with pytest.raises(ValidationError):
        _config(velocidad_mm_min=2500)


def test_construir_replicas_cantidad_y_parametros_identicos():
    celdas = construir_replicas(_config(repeticiones=5))
    assert len(celdas) == 5
    assert all(c.velocidad_mm_min == 260 for c in celdas)
    assert all(c.potencia_pct == 100 for c in celdas)
    assert all(c.tamano_mm == celdas[0].tamano_mm for c in celdas)


def test_construir_replicas_ids_secuenciales_con_prefijo():
    celdas = construir_replicas(_config(id_prefijo="F", repeticiones=3))
    assert [c.id for c in celdas] == ["F-001", "F-002", "F-003"]


def test_construir_replicas_no_hay_posiciones_repetidas():
    celdas = construir_replicas(_config(repeticiones=8))
    posiciones = {(c.x_mm, c.y_mm) for c in celdas}
    assert len(posiciones) == 8


def test_generar_final_run_todas_las_filas_comparten_grupo_y_ejecucion():
    _, filas = generar_final_run(_config(repeticiones=5, ejecucion=2))
    assert len(filas) == 5
    grupos = {fila["grupo_calibracion_id"] for fila in filas}
    ejecuciones = {fila["ejecucion"] for fila in filas}
    corridas = {fila["corrida_id"] for fila in filas}
    assert grupos == {"MDF-Trupan_3mm_corte_260mmmin_100pct"}
    assert ejecuciones == {2}
    assert corridas == {"MDF-Trupan_3mm_corte_260mmmin_100pct_ejec2"}


def test_generar_final_run_pesos_de_tiempo_identicos_entre_celdas():
    """Todas las celdas de una Final Run deben pesar exactamente igual: es la
    propiedad que hace exacto (no aproximado) el prorrateo de kWh medido."""
    _, filas = generar_final_run(_config(repeticiones=5))
    tiempos = {fila["tiempo_estimado_celda_s"] for fila in filas}
    assert len(tiempos) == 1


def test_generar_final_run_grabado_no_cobra_area_material():
    _, filas = generar_final_run(_config(operacion="grabado", repeticiones=3))
    assert all(fila["area_material_mm2"] == 0.0 for fila in filas)


def test_generar_final_run_corte_cobra_area_material():
    _, filas = generar_final_run(_config(operacion="corte", tamano_celda_mm=15.0, repeticiones=3))
    assert all(fila["area_material_mm2"] == 225.0 for fila in filas)
