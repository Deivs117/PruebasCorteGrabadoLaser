import math

import pytest

from laser_toolkit.svg.geometry import Subpath
from laser_toolkit.svg.transform import aplicar_transformacion, calcular_transformacion, rotar_punto


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


# --- rotacion (issue #16, mecanismo compartido con #15) ---------------------


def test_rotar_punto_angulo_cero_es_identidad():
    assert rotar_punto((3.0, 4.0), centro=(1.0, 1.0), angulo_rad=0.0) == (3.0, 4.0)


def test_rotar_punto_90_grados_alrededor_del_origen():
    # (1, 0) rotado 90 grados antihorario -> (0, 1).
    x, y = rotar_punto((1.0, 0.0), centro=(0.0, 0.0), angulo_rad=math.pi / 2)
    assert x == pytest.approx(0.0, abs=1e-9)
    assert y == pytest.approx(1.0)


def test_rotar_punto_180_grados_alrededor_de_un_centro_no_nulo():
    # 180 grados alrededor de (5, 5) manda (6, 5) a (4, 5).
    x, y = rotar_punto((6.0, 5.0), centro=(5.0, 5.0), angulo_rad=math.pi)
    assert x == pytest.approx(4.0)
    assert y == pytest.approx(5.0)


def test_calcular_transformacion_sin_angulo_no_rota():
    t = calcular_transformacion(viewbox=(0, 0, 100, 100), ancho_mm=10, alto_mm=10)
    assert t.angulo_rad == 0.0
    assert t.aplicar((0, 0)) == pytest.approx((0, 10))


def test_calcular_transformacion_rota_alrededor_del_centro_de_la_caja():
    # Cuadrado 100x100 en una caja de 10x10 (sin padding, escala 0.1): el
    # centro de la caja es (5, 5). Sin rotar, el punto SVG (0, 0) cae en la
    # esquina superior-izquierda en mm (0, 10) -- ver test_eje_y_se_invierte.
    # Rotando 90 grados antihorario alrededor de (5, 5), esa esquina pasa a
    # ocupar la posicion de la esquina inferior-izquierda (0, 0).
    t = calcular_transformacion(viewbox=(0, 0, 100, 100), ancho_mm=10, alto_mm=10, angulo_rad=math.pi / 2)
    assert t.centro_rotacion == (5.0, 5.0)
    x, y = t.aplicar((0, 0))  # sin rotar daria (0, 10)
    assert x == pytest.approx(0.0, abs=1e-9)
    assert y == pytest.approx(0.0, abs=1e-9)


def test_rotacion_preserva_distancia_al_centro():
    t = calcular_transformacion(viewbox=(0, 0, 100, 100), ancho_mm=10, alto_mm=10, angulo_rad=0.37)
    cx, cy = t.centro_rotacion
    x, y = t.aplicar((0, 0))
    assert math.hypot(x - cx, y - cy) == pytest.approx(math.hypot(10 - cx, 10 - cy))
