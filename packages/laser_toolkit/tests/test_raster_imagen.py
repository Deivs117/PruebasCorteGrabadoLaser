import io

import pytest
from PIL import Image

from laser_toolkit.raster.imagen import decodificar_imagen


def _bytes_de(imagen: Image.Image, formato: str) -> bytes:
    buffer = io.BytesIO()
    imagen.save(buffer, format=formato)
    return buffer.getvalue()


def test_decodifica_png():
    original = Image.new("RGB", (10, 10), color=(255, 0, 0))
    resultado = decodificar_imagen(_bytes_de(original, "PNG"))
    assert resultado.size == (10, 10)


def test_decodifica_jpeg():
    original = Image.new("RGB", (10, 10), color=(0, 255, 0))
    resultado = decodificar_imagen(_bytes_de(original, "JPEG"))
    assert resultado.size == (10, 10)


def test_formato_no_soportado_falla():
    original = Image.new("RGB", (10, 10))
    with pytest.raises(ValueError, match="no soportado"):
        decodificar_imagen(_bytes_de(original, "BMP"))


def test_datos_invalidos_fallan():
    with pytest.raises(ValueError, match="No se pudo decodificar"):
        decodificar_imagen(b"esto no es una imagen")


def test_downscale_automatico_si_excede_dimension_maxima():
    original = Image.new("RGB", (4000, 2000), color=(0, 0, 255))
    resultado = decodificar_imagen(_bytes_de(original, "PNG"))
    assert max(resultado.size) <= 2000
    # Preserva la proporcion original (2:1).
    assert resultado.size[0] == pytest.approx(2 * resultado.size[1], rel=0.02)


def test_imagen_ya_chica_no_se_toca():
    original = Image.new("RGB", (50, 30), color=(1, 2, 3))
    resultado = decodificar_imagen(_bytes_de(original, "PNG"))
    assert resultado.size == (50, 30)
