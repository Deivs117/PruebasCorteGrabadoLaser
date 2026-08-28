import pytest

from laser_toolkit.svg.path_parser import parsear_path


def test_moveto_lineto_absolutos():
    subpaths = parsear_path("M0,0 L10,0 L10,10 Z")
    assert len(subpaths) == 1
    sp = subpaths[0]
    assert sp.cerrado is True
    assert sp.puntos[0] == (0, 0)
    assert sp.puntos[-1] == (10, 10)


def test_lineto_relativo():
    subpaths = parsear_path("M0,0 l10,0 l0,10")
    sp = subpaths[0]
    assert sp.puntos == ((0, 0), (10, 0), (10, 10))
    assert sp.cerrado is False


def test_horizontal_y_vertical():
    subpaths = parsear_path("M5,5 H20 V20 h-15 v-15")
    sp = subpaths[0]
    assert sp.puntos == ((5, 5), (20, 5), (20, 20), (5, 20), (5, 5))


def test_moveto_con_pares_implicitos_lineto():
    # "M x,y a,b c,d" -- tras el primer par (moveto), los siguientes son L implicito.
    subpaths = parsear_path("M0,0 10,0 10,10")
    sp = subpaths[0]
    assert sp.puntos == ((0, 0), (10, 0), (10, 10))


def test_curva_cubica_empieza_y_termina_en_los_puntos_correctos():
    subpaths = parsear_path("M0,0 C0,10 10,10 10,0")
    sp = subpaths[0]
    assert sp.puntos[0] == pytest.approx((0, 0))
    assert sp.puntos[-1] == pytest.approx((10, 0))
    assert len(sp.puntos) > 2  # la curva se aplano en varios segmentos


def test_s_refleja_el_control_de_la_c_anterior():
    # Una C seguida de una S continua suavemente -- solo verificamos que no
    # falle y que el punto final sea el esperado (el reflejo en si ya se
    # prueba indirectamente via la forma real del logo en test_document_svg).
    subpaths = parsear_path("M0,0 C0,10 10,10 10,0 S20,-10 20,0")
    sp = subpaths[0]
    assert sp.puntos[-1] == pytest.approx((20, 0))


def test_q_y_t_cuadraticas():
    subpaths = parsear_path("M0,0 Q5,10 10,0 T20,0")
    sp = subpaths[0]
    assert sp.puntos[-1] == pytest.approx((20, 0))


def test_multiples_subpaths_en_un_solo_d():
    subpaths = parsear_path("M0,0 L10,0 Z M20,20 L30,20 Z")
    assert len(subpaths) == 2
    assert subpaths[0].cerrado and subpaths[1].cerrado


def test_arco_no_soportado_levanta_error():
    with pytest.raises(ValueError, match="arcos"):
        parsear_path("M0,0 A5,5 0 0 1 10,10")


def test_cantidad_de_numeros_invalida_levanta_error():
    with pytest.raises(ValueError):
        parsear_path("M0,0 L10")  # L necesita pares (x,y), sobra un numero
