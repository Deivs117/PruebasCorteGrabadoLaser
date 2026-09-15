import pytest

from laser_toolkit.svg.api import calcular_centroide_svg_texto
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


def test_subpath_no_cerrado_explicitamente_aporta_area_igual_que_cerrado():
    # Bug real (issue #196, encontrado probando contra un SVG real de
    # cliente): muchos SVG exportados de vectorizacion/Illustrator (fill
    # solido, stroke="none") nunca usan `Z` -- confian en el cierre
    # implicito del renderizador para el fill, valido y estandar en SVG.
    # `centroide_area_subpaths` NO debe filtrar por `subpath.cerrado`: un
    # subpath con 3+ puntos aporta area sin importar ese campo.
    cerrado = _rectangulo(0, 0, 10, 10, cerrado=True)
    sin_cerrar = _rectangulo(0, 0, 10, 10, cerrado=False)
    assert centroide_area_subpaths([cerrado]) == centroide_area_subpaths([sin_cerrar])


def test_sin_ningun_subpath_con_area_es_un_error():
    linea_de_dos_puntos = Subpath(puntos=((0, 0), (10, 10)), cerrado=False)
    with pytest.raises(ValueError, match="al menos 3 puntos"):
        centroide_area_subpaths([linea_de_dos_puntos])


def test_subpaths_de_menos_de_3_puntos_se_ignoran_si_hay_uno_con_area():
    cuadrado = _rectangulo(0, 0, 10, 10)
    linea_de_dos_puntos = Subpath(puntos=((100, 100), (200, 200)), cerrado=False)
    cx, cy = centroide_area_subpaths([cuadrado, linea_de_dos_puntos])
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


def _svg_sin_z(*subpaths_d: str) -> str:
    """`path` con `fill` solido y `stroke="none"` -- mismo patron de un
    export real de vectorizacion/Illustrator -- con varios subpaths (varios
    `M` dentro del mismo `d`) y CERO comandos `Z` en todo el `d`."""
    d = " ".join(subpaths_d)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        f'<path d="{d}" fill="#000000" stroke="none" /></svg>'
    )


def _svg_con_z(*subpaths_d: str) -> str:
    d = " ".join(f"{sub} Z" for sub in subpaths_d)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        f'<path d="{d}" fill="#000000" stroke="none" /></svg>'
    )


def test_svg_real_sin_z_da_el_mismo_centroide_que_con_z_explicito():
    # Reproduce el bug real: un rectangulo asimetrico (mas area a la
    # derecha) partido en dos subpaths dentro del mismo `d`, ninguno
    # cerrado con `Z` -- antes del fix esto reventaba con "no hay subpaths
    # cerrados" pese a tener area real y valida.
    grande = "M0,0 L10,0 L10,10 L0,10"
    chico = "M10,0 L12,0 L12,10 L10,10"

    svg_sin_z = _svg_sin_z(grande, chico)
    svg_con_z = _svg_con_z(grande, chico)

    centroide_sin_z = calcular_centroide_svg_texto(svg_sin_z, ancho_mm=100.0, alto_mm=100.0)
    centroide_con_z = calcular_centroide_svg_texto(svg_con_z, ancho_mm=100.0, alto_mm=100.0)

    assert centroide_sin_z == pytest.approx(centroide_con_z)
