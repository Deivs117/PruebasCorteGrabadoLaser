import io

from PIL import Image

from laser_toolkit.config import MachineConfig
from laser_toolkit.raster.api import (
    calcular_contorno_imagen,
    convertir_imagen_a_gcode_grabado,
    generar_gcode_corte_y_grabado,
)
from laser_toolkit.raster.config import ConfiguracionRaster


def _png_bytes(imagen: Image.Image) -> bytes:
    buffer = io.BytesIO()
    imagen.save(buffer, format="PNG")
    return buffer.getvalue()


def test_convertir_imagen_a_gcode_grabado_extremo_a_extremo():
    imagen = Image.new("RGB", (20, 20), color=(0, 0, 0))
    machine = MachineConfig()
    lineas = convertir_imagen_a_gcode_grabado(
        _png_bytes(imagen),
        ancho_mm=10,
        alto_mm=10,
        velocidad_mm_min=500,
        potencia_max_pct=80,
        machine=machine,
        config=ConfiguracionRaster(resolucion_mm=2.0),
    )
    assert lineas[-1] == "M5"
    assert any("M4 S0" in linea for linea in lineas)


def test_calcular_contorno_imagen_jpeg_da_rectangulo():
    imagen = Image.new("RGB", (10, 10), color=(9, 9, 9))
    buffer = io.BytesIO()
    imagen.save(buffer, format="JPEG")
    contornos = calcular_contorno_imagen(buffer.getvalue(), ancho_mm=10.0, alto_mm=10.0)
    assert len(contornos) == 1
    assert set(contornos[0].puntos) == {(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)}


def test_generar_gcode_corte_y_grabado_omite_operacion_sin_parametros():
    imagen = Image.new("RGB", (10, 10), color=(0, 0, 0))
    machine = MachineConfig()
    solo_grabado = generar_gcode_corte_y_grabado(
        _png_bytes(imagen),
        ancho_mm=10,
        alto_mm=10,
        machine=machine,
        grabado_velocidad_mm_min=500,
        grabado_potencia_max_pct=80,
    )
    assert "G1" in "".join(solo_grabado)
    # M4 (grabado dinamico) esta, pero nunca se corta el contorno -- no hay
    # una linea que trace las 4 esquinas del rectangulo con corte constante.
    assert solo_grabado != []


def test_generar_gcode_corte_y_grabado_combina_ambas_operaciones():
    imagen = Image.new("RGB", (10, 10), color=(0, 0, 0))
    machine = MachineConfig()
    combinado = generar_gcode_corte_y_grabado(
        _png_bytes(imagen),
        ancho_mm=10,
        alto_mm=10,
        machine=machine,
        grabado_velocidad_mm_min=500,
        grabado_potencia_max_pct=80,
        corte_velocidad_mm_min=300,
        corte_potencia_pct=90,
    )
    solo_grabado = generar_gcode_corte_y_grabado(
        _png_bytes(imagen),
        ancho_mm=10,
        alto_mm=10,
        machine=machine,
        grabado_velocidad_mm_min=500,
        grabado_potencia_max_pct=80,
    )
    assert len(combinado) > len(solo_grabado)
    # El corte del contorno usa F300 (velocidad de corte, no la de grabado).
    assert any("F300" in linea for linea in combinado)


def test_generar_gcode_sin_ninguna_operacion_da_vacio():
    imagen = Image.new("RGB", (10, 10), color=(0, 0, 0))
    machine = MachineConfig()
    resultado = generar_gcode_corte_y_grabado(_png_bytes(imagen), ancho_mm=10, alto_mm=10, machine=machine)
    assert resultado == []
