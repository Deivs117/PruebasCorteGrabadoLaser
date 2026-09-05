import pytest

from laser_toolkit.calibracion import resumir_calibracion


def _filas_ejecucion(corrida_id: str, n_replicas: int, kwh_corrida: str, tiempo_corrida: str) -> list[dict]:
    return [
        {
            "grupo_calibracion_id": "MDF-Trupan_3mm_corte_260mmmin_100pct",
            "corrida_id": corrida_id,
            "kwh_corrida_medido": kwh_corrida,
            "tiempo_real_corrida_s": tiempo_corrida,
        }
        for _ in range(n_replicas)
    ]


def test_una_sola_ejecucion_no_tiene_desviacion():
    filas = _filas_ejecucion("grupo_ejec1", n_replicas=5, kwh_corrida="0.05", tiempo_corrida="150")

    resumen = resumir_calibracion(filas, minimo_ejecuciones=3)

    assert resumen.n_ejecuciones == 1
    assert resumen.kwh_por_unidad_medio == pytest.approx(0.01)  # 0.05 / 5
    assert resumen.tiempo_por_unidad_s_medio == pytest.approx(30.0)  # 150 / 5
    assert resumen.kwh_por_unidad_desv_std is None
    assert resumen.kwh_por_unidad_cv_pct is None
    assert resumen.calibrado is False


def test_tres_ejecuciones_consistentes_calibra():
    filas = (
        _filas_ejecucion("ejec1", 5, "0.050", "150")
        + _filas_ejecucion("ejec2", 5, "0.051", "148")
        + _filas_ejecucion("ejec3", 5, "0.049", "151")
    )

    resumen = resumir_calibracion(filas, minimo_ejecuciones=3)

    assert resumen.n_ejecuciones == 3
    assert resumen.calibrado is True
    assert resumen.kwh_por_unidad_desv_std is not None
    assert resumen.kwh_por_unidad_cv_pct is not None
    assert resumen.kwh_por_unidad_cv_pct < 5  # mediciones consistentes -> CV bajo


def test_grupos_de_calibracion_mezclados_falla():
    filas = _filas_ejecucion("ejec1", 3, "0.05", "150")
    filas += [
        {**fila, "grupo_calibracion_id": "OTRO_GRUPO"} for fila in _filas_ejecucion("ejec2", 3, "0.05", "150")
    ]

    with pytest.raises(ValueError, match="unico grupo_calibracion_id"):
        resumir_calibracion(filas)


def test_medicion_faltante_falla():
    filas = _filas_ejecucion("ejec1", 3, "", "150")

    with pytest.raises(ValueError, match="falta kwh_corrida_medido"):
        resumir_calibracion(filas)


def test_lista_vacia_falla():
    with pytest.raises(ValueError, match="no hay filas"):
        resumir_calibracion([])


def test_filas_sin_grupo_calibracion_falla():
    filas = [
        {
            "grupo_calibracion_id": "",
            "corrida_id": "x",
            "kwh_corrida_medido": "0.05",
            "tiempo_real_corrida_s": "150",
        }
    ]

    with pytest.raises(ValueError, match="Final Run"):
        resumir_calibracion(filas)
