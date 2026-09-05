import pytest

from laser_toolkit.svg.bezier import aplanar_cuadratica, aplanar_cubica


def test_aplanar_cubica_termina_en_p3():
    puntos = aplanar_cubica((0, 0), (0, 10), (10, 10), (10, 0), pasos=8)
    assert puntos[-1] == pytest.approx((10, 0))
    assert len(puntos) == 8


def test_aplanar_cubica_recta_da_puntos_colineales():
    # p0..p3 alineados en una recta -> toda la curva debe caer en esa recta.
    puntos = aplanar_cubica((0, 0), (1, 0), (2, 0), (3, 0), pasos=5)
    assert all(p[1] == pytest.approx(0) for p in puntos)


def test_aplanar_cuadratica_termina_en_p2():
    puntos = aplanar_cuadratica((0, 0), (5, 10), (10, 0), pasos=6)
    assert puntos[-1] == pytest.approx((10, 0))


def test_pasos_invalidos_falla():
    with pytest.raises(ValueError):
        aplanar_cubica((0, 0), (0, 0), (0, 0), (0, 0), pasos=0)
    with pytest.raises(ValueError):
        aplanar_cuadratica((0, 0), (0, 0), (0, 0), pasos=0)
