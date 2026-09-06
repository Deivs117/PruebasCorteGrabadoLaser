import pytest
from PIL import Image

from laser_toolkit.raster.canal import calcular_matriz_intensidad
from laser_toolkit.raster.config import CanalRaster, ConfiguracionRaster


def _imagen_mitad_negra_mitad_blanca() -> Image.Image:
    """20x10: columnas 0-9 negras, columnas 10-19 blancas."""
    imagen = Image.new("RGB", (20, 10), color=(255, 255, 255))
    negro = Image.new("RGB", (10, 10), color=(0, 0, 0))
    imagen.paste(negro, (0, 0))
    return imagen


def _imagen_degradado_horizontal(ancho: int = 20, alto: int = 10) -> Image.Image:
    """Degradado real de negro a blanco, columna por columna."""
    imagen = Image.new("RGB", (ancho, alto))
    for x in range(ancho):
        valor = round(255 * x / (ancho - 1))
        for y in range(alto):
            imagen.putpixel((x, y), (valor, valor, valor))
    return imagen


def test_grilla_tiene_las_dimensiones_pedidas():
    imagen = Image.new("RGB", (100, 100), color=(128, 128, 128))
    config = ConfiguracionRaster(resolucion_mm=1.0)
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=5, alto_mm=3, config=config)
    assert len(matriz) == 3
    assert all(len(fila) == 5 for fila in matriz)


def test_negro_es_intensidad_maxima_por_defecto():
    """Convencion por defecto (issue #3): pixel mas oscuro = mas potencia."""
    imagen = Image.new("RGB", (10, 10), color=(0, 0, 0))
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=1, alto_mm=1, config=ConfiguracionRaster())
    assert matriz[0][0] == pytest.approx(1.0)


def test_blanco_es_intensidad_minima_por_defecto():
    imagen = Image.new("RGB", (10, 10), color=(255, 255, 255))
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=1, alto_mm=1, config=ConfiguracionRaster())
    assert matriz[0][0] == pytest.approx(0.0)


def test_invertir_cambia_la_direccion():
    imagen = Image.new("RGB", (10, 10), color=(0, 0, 0))
    config = ConfiguracionRaster(invertir=True)
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=1, alto_mm=1, config=config)
    assert matriz[0][0] == pytest.approx(0.0)  # negro deja de ser el maximo


def test_negro_a_la_izquierda_da_mas_intensidad_que_blanco_a_la_derecha():
    imagen = _imagen_mitad_negra_mitad_blanca()
    config = ConfiguracionRaster(resolucion_mm=1.0)  # 1 muestra/mm -> 20 columnas
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=20, alto_mm=10, config=config)
    izquierda = matriz[5][2]
    derecha = matriz[5][17]
    assert izquierda > derecha


def test_canal_rojo_ignora_verde_y_azul():
    imagen = Image.new("RGB", (10, 10), color=(0, 255, 255))  # sin rojo, cian puro
    config = ConfiguracionRaster(canal=CanalRaster.ROJO)
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=1, alto_mm=1, config=config)
    # Canal rojo = 0 (claridad minima) -> intensidad maxima (convencion default).
    assert matriz[0][0] == pytest.approx(1.0)


def test_mezcla_con_pesos_iguales_a_luminancia_no_es_ninguno_de_los_canales_puros():
    imagen = Image.new("RGB", (10, 10), color=(255, 0, 0))  # rojo puro
    config = ConfiguracionRaster(
        canal=CanalRaster.MEZCLA, peso_rojo=1 / 3, peso_verde=1 / 3, peso_azul=1 / 3
    )
    matriz = calcular_matriz_intensidad(imagen, ancho_mm=1, alto_mm=1, config=config)
    # Con rojo=255,verde=0,azul=0 y pesos 1/3 cada uno, la claridad mezclada
    # es ~255/3 (no 0 como daria el canal rojo puro invertido, ni 255 como
    # daria un canal sin nada de rojo) -- confirma que de verdad promedia.
    assert 0.5 < matriz[0][0] < 0.8


def test_pesos_de_mezcla_en_canal_fijo_es_error():
    with pytest.raises(ValueError, match="solo aplican con canal=mezcla"):
        ConfiguracionRaster(canal=CanalRaster.ROJO, peso_rojo=0.9)


def test_gamma_mayor_a_uno_aclara_los_tonos_medios():
    imagen = Image.new("RGB", (10, 10), color=(128, 128, 128))
    sin_gamma = calcular_matriz_intensidad(imagen, ancho_mm=1, alto_mm=1, config=ConfiguracionRaster())
    con_gamma = calcular_matriz_intensidad(
        imagen, ancho_mm=1, alto_mm=1, config=ConfiguracionRaster(gamma=2.2)
    )
    assert con_gamma[0][0] != pytest.approx(sin_gamma[0][0])


def test_posterizado_reduce_a_niveles_discretos_de_un_degradado_continuo():
    imagen = _imagen_degradado_horizontal()
    config = ConfiguracionRaster(resolucion_mm=1.0)
    sin_posterizar = calcular_matriz_intensidad(imagen, ancho_mm=20, alto_mm=10, config=config)
    valores_continuos = {round(v, 4) for fila in sin_posterizar for v in fila}
    assert len(valores_continuos) > 4  # el degradado real tiene muchos valores distintos

    config_posterizada = ConfiguracionRaster(resolucion_mm=1.0, niveles_posterizado=4)
    posterizada = calcular_matriz_intensidad(imagen, ancho_mm=20, alto_mm=10, config=config_posterizada)
    valores_discretos = {round(v, 4) for fila in posterizada for v in fila}
    assert len(valores_discretos) <= 4
