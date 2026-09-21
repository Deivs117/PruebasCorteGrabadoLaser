import pytest
from PIL import Image

from laser_toolkit.raster.centroide import centroide_ponderado_imagen


def _rgba_con_cuadrado_opaco(ancho: int, alto: int, cuadrado: tuple[int, int, int, int]) -> Image.Image:
    imagen = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    x0, y0, x1, y1 = cuadrado
    for x in range(x0, x1):
        for y in range(y0, y1):
            imagen.putpixel((x, y), (0, 0, 0, 255))
    return imagen


def _rgb_con_cuadrado(
    ancho: int, alto: int, cuadrado: tuple[int, int, int, int], fondo=(255, 255, 255), color=(0, 0, 0)
) -> Image.Image:
    imagen = Image.new("RGB", (ancho, alto), fondo)
    x0, y0, x1, y1 = cuadrado
    for x in range(x0, x1):
        for y in range(y0, y1):
            imagen.putpixel((x, y), color)
    return imagen


def test_alfa_simetrico_centroide_es_el_centro_geometrico():
    # Cuadrado opaco centrado en una imagen 10x10.
    imagen = _rgba_con_cuadrado_opaco(10, 10, (2, 2, 8, 8))
    cx, cy = centroide_ponderado_imagen(imagen, ancho_mm=10.0, alto_mm=10.0)
    assert cx == pytest.approx(5.0, abs=0.15)
    assert cy == pytest.approx(5.0, abs=0.15)


def test_alfa_asimetrico_centroide_se_corre_hacia_la_tinta():
    # Cuadrado opaco pegado a la derecha de una imagen 10x10 (x: 6-10) --
    # el centroide tiene que caer claramente a la derecha del centro
    # geometrico (5,5) de la imagen completa.
    imagen = _rgba_con_cuadrado_opaco(10, 10, (6, 0, 10, 10))
    cx, cy = centroide_ponderado_imagen(imagen, ancho_mm=10.0, alto_mm=10.0)
    assert cx > 6.5


def test_imagen_sin_alfa_usa_el_umbral_de_distancia_de_fondo():
    # JPEG opaco (sin banda alfa): cuadrado negro sobre fondo blanco, pegado
    # a la derecha -- el umbral por defecto tiene que detectar el fondo
    # blanco (domina el borde) y correr el centroide hacia el cuadrado.
    imagen = _rgb_con_cuadrado(20, 20, (14, 0, 20, 20))
    cx, cy = centroide_ponderado_imagen(imagen, ancho_mm=20.0, alto_mm=20.0)
    assert cx > 10.0


def test_imagen_opaca_simetrica_centroide_es_el_centro_geometrico():
    imagen = _rgb_con_cuadrado(20, 20, (8, 8, 12, 12))
    cx, cy = centroide_ponderado_imagen(imagen, ancho_mm=20.0, alto_mm=20.0)
    assert cx == pytest.approx(10.0, abs=0.5)
    assert cy == pytest.approx(10.0, abs=0.5)


def test_umbral_muy_alto_no_detecta_tinta_es_un_error():
    # Cuadrado GRIS (contraste moderado, no negro puro) sobre fondo blanco:
    # con el umbral por defecto se detecta sin problema, pero un umbral alto
    # a proposito lo descarta como "ruido de fondo" -- ningun peso sobrevive.
    imagen = _rgb_con_cuadrado(20, 20, (8, 8, 12, 12), color=(160, 160, 160))
    centroide_ponderado_imagen(imagen, ancho_mm=20.0, alto_mm=20.0)  # umbral por defecto: sin error
    with pytest.raises(ValueError, match="No se detecto tinta"):
        centroide_ponderado_imagen(imagen, ancho_mm=20.0, alto_mm=20.0, umbral_distancia_fondo=0.8)


def test_umbral_fuera_de_rango_es_un_error():
    imagen = _rgb_con_cuadrado(10, 10, (2, 2, 8, 8))
    with pytest.raises(ValueError, match="entre 0.0 y 1.0"):
        centroide_ponderado_imagen(imagen, ancho_mm=10.0, alto_mm=10.0, umbral_distancia_fondo=1.5)


def test_imagen_completamente_transparente_es_un_error():
    imagen = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
    # Alfa 0 en todos lados (transparencia real, entra por el camino de
    # `_centroide_por_alfa`) -- sin ningun pixel con algo de opacidad, todos
    # los pesos quedan en cero.
    with pytest.raises(ValueError, match="No se detecto tinta"):
        centroide_ponderado_imagen(imagen, ancho_mm=10.0, alto_mm=10.0)
