import math

import pytest

from laser_toolkit.raster.contorno import generar_marco


def test_marco_cuadrado_tiene_el_lado_pedido_centrado():
    marco = generar_marco((5.0, 5.0), "cuadrado", 10.0)
    assert marco.cerrado is True
    xs = [p[0] for p in marco.puntos]
    ys = [p[1] for p in marco.puntos]
    assert min(xs) == pytest.approx(0.0)
    assert max(xs) == pytest.approx(10.0)
    assert min(ys) == pytest.approx(0.0)
    assert max(ys) == pytest.approx(10.0)


def test_marco_circulo_tiene_el_diametro_pedido_centrado():
    marco = generar_marco((5.0, 5.0), "circulo", 10.0)
    assert marco.cerrado is True
    for x, y in marco.puntos:
        distancia = math.hypot(x - 5.0, y - 5.0)
        assert distancia == pytest.approx(5.0, abs=1e-6)


def test_marco_circulo_centrado_en_un_punto_arbitrario():
    marco = generar_marco((12.0, -3.0), "circulo", 6.0)
    for x, y in marco.puntos:
        assert math.hypot(x - 12.0, y - (-3.0)) == pytest.approx(3.0, abs=1e-6)


def test_marco_cuadrado_centrado_en_un_punto_arbitrario():
    marco = generar_marco((12.0, -3.0), "cuadrado", 4.0)
    xs = [p[0] for p in marco.puntos]
    ys = [p[1] for p in marco.puntos]
    assert min(xs) == pytest.approx(10.0)
    assert max(xs) == pytest.approx(14.0)
    assert min(ys) == pytest.approx(-5.0)
    assert max(ys) == pytest.approx(-1.0)


def test_tamano_cero_o_negativo_es_un_error():
    with pytest.raises(ValueError, match="mayor a 0"):
        generar_marco((0.0, 0.0), "circulo", 0.0)
    with pytest.raises(ValueError, match="mayor a 0"):
        generar_marco((0.0, 0.0), "cuadrado", -5.0)


def test_forma_no_soportada_es_un_error():
    with pytest.raises(ValueError, match="no soportada"):
        generar_marco((0.0, 0.0), "triangulo", 5.0)  # type: ignore[arg-type]
