import pytest

from laser_toolkit.svg.fill import generar_segmentos_relleno
from laser_toolkit.svg.geometry import Subpath


def test_relleno_de_un_cuadrado():
    cuadrado = Subpath(puntos=((0, 0), (10, 0), (10, 10), (0, 10)), cerrado=True)
    segmentos = generar_segmentos_relleno([cuadrado], resolucion_mm=2.0)
    assert len(segmentos) == 5  # 10mm de alto / 2mm de paso
    for (x1, y1), (x2, y2) in segmentos:
        # Zigzag: filas alternadas van 0->10 o 10->0, nunca uniendo dos
        # filas ni recortando el ancho real (siempre 10mm, en un sentido u otro).
        assert sorted((x1, x2)) == pytest.approx([0, 10])
        assert y1 == y2


def test_relleno_alterna_sentido_por_fila_zigzag():
    """La fila de "ida" va de izquierda a derecha, la de "vuelta" al reves
    -- para que la maquina no viaje en vacio de vuelta al extremo izquierdo
    en cada fila (hallazgo real: se detecto en una pieza en produccion)."""
    cuadrado = Subpath(puntos=((0, 0), (10, 0), (10, 10), (0, 10)), cerrado=True)
    segmentos = generar_segmentos_relleno([cuadrado], resolucion_mm=2.0)
    assert len(segmentos) == 5
    # Fila 0 (ida): 0 -> 10. Fila 1 (vuelta): 10 -> 0. Y asi alternando.
    for i, ((x1, _y1), (x2, _y2)) in enumerate(segmentos):
        if i % 2 == 0:
            assert (x1, x2) == pytest.approx((0, 10))
        else:
            assert (x1, x2) == pytest.approx((10, 0))


def test_dos_formas_separadas_se_rellenan_por_separado():
    izquierda = Subpath(puntos=((0, 0), (10, 0), (10, 10), (0, 10)), cerrado=True)
    derecha = Subpath(puntos=((20, 0), (30, 0), (30, 10), (20, 10)), cerrado=True)
    segmentos = generar_segmentos_relleno([izquierda, derecha], resolucion_mm=5.0)
    # cada franja horizontal produce 2 segmentos (uno por cuadrado), nunca uno
    # que los una (el hueco entre x=10 y x=20 no se rellena) -- el ancho real
    # es 10mm sin importar el sentido (zigzag).
    assert all(abs(seg[1][0] - seg[0][0]) == pytest.approx(10) for seg in segmentos)


def test_forma_con_hueco_regla_par_impar():
    # Cuadrado grande con un cuadrado pequeno "sustraido" en el medio (como
    # el agujero de una letra 'O'): la regla par-impar debe dejar el centro
    # sin rellenar.
    exterior = Subpath(puntos=((0, 0), (20, 0), (20, 20), (0, 20)), cerrado=True)
    interior = Subpath(puntos=((5, 5), (15, 5), (15, 15), (5, 15)), cerrado=True)
    # resolucion=20 -> una sola franja de muestreo, exactamente en y=10 (centrada
    # en y_min + resolucion/2 = 0 + 10).
    segmentos = generar_segmentos_relleno([exterior, interior], resolucion_mm=20.0)
    assert len(segmentos) == 2  # 0->5 y 15->20 (el 5->15 del centro esta hueco)
    anchos = sorted(seg[1][0] - seg[0][0] for seg in segmentos)
    assert anchos == pytest.approx([5.0, 5.0])


def test_resolucion_no_positiva_falla():
    with pytest.raises(ValueError):
        generar_segmentos_relleno([Subpath(puntos=((0, 0), (1, 0), (1, 1)), cerrado=True)], resolucion_mm=0)


def test_sin_subpaths_no_genera_segmentos():
    assert generar_segmentos_relleno([], resolucion_mm=1.0) == []
