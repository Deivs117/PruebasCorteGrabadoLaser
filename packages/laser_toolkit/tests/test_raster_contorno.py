from PIL import Image

from laser_toolkit.raster.contorno import extraer_contorno


def _rgba_con_cuadrado_opaco(ancho: int, alto: int, cuadrado: tuple[int, int, int, int]) -> Image.Image:
    """RGBA transparente salvo un rectangulo `(x0, y0, x1, y1)` (exclusivo)
    completamente opaco -- silueta simple y predecible para testear el
    trazado de bordes."""
    imagen = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    x0, y0, x1, y1 = cuadrado
    for x in range(x0, x1):
        for y in range(y0, y1):
            imagen.putpixel((x, y), (0, 0, 0, 255))
    return imagen


def test_jpeg_opaco_da_contorno_rectangular():
    imagen = Image.new("RGB", (10, 20), color=(1, 2, 3))  # sin banda alfa, como un JPEG decodificado
    contornos = extraer_contorno(imagen, ancho_mm=10.0, alto_mm=20.0)
    assert len(contornos) == 1
    assert contornos[0].cerrado is True
    assert set(contornos[0].puntos) == {(0.0, 0.0), (10.0, 0.0), (10.0, 20.0), (0.0, 20.0)}


def test_png_completamente_opaco_da_contorno_rectangular():
    """Un PNG con canal alfa pero sin transparencia real (todo 255) no vale
    la pena trazarlo pixel por pixel -- cae al mismo caso que un JPEG."""
    imagen = Image.new("RGBA", (10, 10), color=(5, 5, 5, 255))
    contornos = extraer_contorno(imagen, ancho_mm=10.0, alto_mm=10.0)
    assert len(contornos) == 1
    assert set(contornos[0].puntos) == {(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)}


def test_png_con_transparencia_real_sigue_la_silueta():
    # Imagen 10x10, cuadrado opaco solo en el centro (3,3)-(7,7): la silueta
    # trazada tiene que ser mas chica que el rectangulo completo.
    imagen = _rgba_con_cuadrado_opaco(10, 10, (3, 3, 7, 7))
    contornos = extraer_contorno(imagen, ancho_mm=10.0, alto_mm=10.0)
    assert len(contornos) == 1
    xs = [p[0] for p in contornos[0].puntos]
    ys = [p[1] for p in contornos[0].puntos]
    assert min(xs) == 3.0
    assert max(xs) == 7.0
    # Y invertido: la fila de pixeles 3-6 (arriba) cae en la mitad ALTA en mm.
    assert min(ys) == 3.0
    assert max(ys) == 7.0


def test_silueta_es_un_bucle_cerrado_de_al_menos_4_puntos():
    imagen = _rgba_con_cuadrado_opaco(10, 10, (2, 2, 5, 5))
    contornos = extraer_contorno(imagen, ancho_mm=10.0, alto_mm=10.0)
    assert len(contornos) == 1
    assert contornos[0].cerrado is True
    assert len(contornos[0].puntos) >= 4


def test_dos_siluetas_separadas_dan_dos_contornos():
    imagen = Image.new("RGBA", (20, 10), (0, 0, 0, 0))
    for x, y in [(1, 1), (2, 1), (1, 2), (2, 2)]:
        imagen.putpixel((x, y), (0, 0, 0, 255))
    for x, y in [(15, 5), (16, 5), (15, 6), (16, 6)]:
        imagen.putpixel((x, y), (0, 0, 0, 255))
    contornos = extraer_contorno(imagen, ancho_mm=20.0, alto_mm=10.0)
    assert len(contornos) == 2
