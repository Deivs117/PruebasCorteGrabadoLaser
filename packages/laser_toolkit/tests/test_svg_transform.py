import pytest

from laser_toolkit.svg.geometry import Subpath
from laser_toolkit.svg.transform import aplicar_transformacion, calcular_transformacion


def test_escala_preserva_proporcion_cuadrada():
    t = calcular_transformacion(viewbox=(0, 0, 800, 800), ancho_mm=40, alto_mm=40)
    assert t.escala == pytest.approx(0.05)
    assert t.offset_x == pytest.approx(0)
    assert t.offset_y == pytest.approx(0)


def test_centra_cuando_la_proporcion_no_coincide():
    # viewBox 800x400 (2:1) en una caja cuadrada de 40x40 -> escala limitada
    # por el ancho, con relleno vertical repartido arriba y abajo.
    t = calcular_transformacion(viewbox=(0, 0, 800, 400), ancho_mm=40, alto_mm=40)
    assert t.escala == pytest.approx(0.05)
    assert t.offset_y == pytest.approx(10)  # (40 - 400*0.05) / 2
    assert t.offset_x == pytest.approx(0)


def test_eje_y_se_invierte():
    t = calcular_transformacion(viewbox=(0, 0, 100, 100), ancho_mm=10, alto_mm=10)
    # El origen SVG (0,0) esta arriba-izquierda; en mm debe quedar arriba (Y=10).
    assert t.aplicar((0, 0)) == pytest.approx((0, 10))
    # El punto (0, 100) (abajo-izquierda en SVG) debe quedar en Y=0 en mm.
    assert t.aplicar((0, 100)) == pytest.approx((0, 0))


def test_viewbox_invalido_falla():
    with pytest.raises(ValueError):
        calcular_transformacion(viewbox=(0, 0, 0, 100), ancho_mm=10, alto_mm=10)


def test_aplicar_transformacion_preserva_cerrado():
    t = calcular_transformacion(viewbox=(0, 0, 100, 100), ancho_mm=10, alto_mm=10)
    subpaths = [Subpath(puntos=((0, 0), (100, 0), (100, 100)), cerrado=True)]
    resultado = aplicar_transformacion(subpaths, t)
    assert resultado[0].cerrado is True
    assert len(resultado[0].puntos) == 3
