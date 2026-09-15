import pytest

from laser_toolkit.svg.centroide import centroide_area_subpaths
from laser_toolkit.svg.geometry import Subpath


def _rectangulo(x0: float, y0: float, x1: float, y1: float, cerrado: bool = True) -> Subpath:
    return Subpath(puntos=((x0, y0), (x1, y0), (x1, y1), (x0, y1)), cerrado=cerrado)


def test_forma_simetrica_centroide_es_el_centro_geometrico():
    cuadrado = _rectangulo(0, 0, 10, 10)
    cx, cy = centroide_area_subpaths([cuadrado])
    assert cx == pytest.approx(5.0)
    assert cy == pytest.approx(5.0)


def test_forma_asimetrica_centroide_se_corre_hacia_donde_hay_mas_area():
    # Union de un cuadrado grande (0,0)-(10,10) y uno chico pegado a la
    # derecha (10,0)-(12,10) -- como dos subpaths separados que se combinan
    # por area, el centroide tiene que quedar corrido hacia la derecha del
    # centro geometrico del cuadrado grande solo (5,5).
    grande = _rectangulo(0, 0, 10, 10)
    chico = _rectangulo(10, 0, 12, 10)
    cx, cy = centroide_area_subpaths([grande, chico])
    assert cx > 5.0
    assert cy == pytest.approx(5.0)


def test_solo_subpaths_abiertos_es_un_error():
    linea_abierta = Subpath(puntos=((0, 0), (10, 0), (10, 10)), cerrado=False)
    with pytest.raises(ValueError, match="cerrados"):
        centroide_area_subpaths([linea_abierta])


def test_subpaths_abiertos_se_ignoran_si_hay_uno_cerrado():
    cuadrado = _rectangulo(0, 0, 10, 10)
    linea_abierta = Subpath(puntos=((100, 100), (200, 200)), cerrado=False)
    cx, cy = centroide_area_subpaths([cuadrado, linea_abierta])
    assert cx == pytest.approx(5.0)
    assert cy == pytest.approx(5.0)


def test_agujero_con_giro_opuesto_corre_el_centroide_lejos_del_agujero():
    # Cuadrado exterior (0,0)-(20,20) en sentido antihorario (area positiva)
    # con un "agujero" cuadrado (0,0)-(8,8) en sentido horario (area
    # negativa, mismo truco que usa el relleno SVG nonzero/evenodd para
    # marcar un subpath interior como hueco) -- el centroide del área neta
    # tiene que alejarse del agujero (esquina inferior-izquierda), corriendo
    # hacia arriba-derecha respecto del centro geometrico (10,10) del
    # cuadrado exterior solo.
    exterior = _rectangulo(0, 0, 20, 20)  # antihorario: (0,0)->(20,0)->(20,20)->(0,20)
    agujero = Subpath(puntos=((0, 0), (0, 8), (8, 8), (8, 0)), cerrado=True)  # horario
    cx, cy = centroide_area_subpaths([exterior, agujero])
    assert cx > 10.0
    assert cy > 10.0


def test_area_total_cero_es_un_error():
    # Un cuadrado y su reflejo (misma area, signo opuesto) se cancelan
    # exactamente.
    horario = Subpath(puntos=((0, 0), (0, 10), (10, 10), (10, 0)), cerrado=True)
    antihorario = Subpath(puntos=((0, 0), (10, 0), (10, 10), (0, 10)), cerrado=True)
    with pytest.raises(ValueError, match="area total"):
        centroide_area_subpaths([horario, antihorario])
