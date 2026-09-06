import math

import pytest

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.writer import sobrerecorrido_mm
from laser_toolkit.raster.gcode import gcode_grabado_raster


def test_matriz_vacia_no_genera_gcode():
    assert gcode_grabado_raster([], 10, 10, 0, 0, 500, 100, MachineConfig()) == []


def test_termina_apagando_el_laser():
    machine = MachineConfig()
    matriz = [[0.5, 0.5], [0.5, 0.5]]
    lineas = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 100, machine)
    assert lineas[-1] == "M5"


def test_una_fila_por_muestra_vertical():
    machine = MachineConfig()
    matriz = [[1.0] * 4 for _ in range(3)]  # 3 filas
    lineas = gcode_grabado_raster(matriz, 10, 6, 0, 0, 500, 100, machine)
    assert lineas.count("M4 S0") == 3  # un G0+M4 S0 de entrada por fila


def test_pixel_negro_llega_al_techo_de_potencia():
    machine = MachineConfig(laser_max_s=1000)
    matriz = [[1.0]]  # una sola muestra, intensidad maxima
    lineas = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 80, machine)
    # El techo (potencia_max_pct=80% de laser_max_s=1000) debe aparecer.
    assert any(linea.endswith("S800") for linea in lineas)


def test_intensidad_menor_da_potencia_proporcionalmente_menor():
    machine = MachineConfig(laser_max_s=1000)
    matriz = [[1.0, 0.5]]
    lineas = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 100, machine)
    assert any(linea.endswith("S1000") for linea in lineas)
    assert any(linea.endswith("S500") for linea in lineas)


def test_pixel_blanco_no_enciende_el_laser():
    machine = MachineConfig(laser_max_s=1000)
    matriz = [[0.0]]
    lineas = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 100, machine)
    assert all(linea.endswith("S0") for linea in lineas if " S" in linea)


def test_zigzag_alterna_direccion_entre_filas():
    machine = MachineConfig()
    matriz = [[0.2, 0.8], [0.2, 0.8]]
    lineas = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 100, machine)
    lineas_g0 = [linea for linea in lineas if linea.startswith("G0")]
    assert len(lineas_g0) == 2
    x_fila_0 = float(lineas_g0[0].split()[1][1:])
    x_fila_1 = float(lineas_g0[1].split()[1][1:])
    assert x_fila_0 != pytest.approx(x_fila_1)  # entra por lados opuestos


def test_incluye_sobrerecorrido_en_los_extremos():
    machine = MachineConfig()
    matriz = [[0.5]]
    lineas = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 100, machine)
    overscan = sobrerecorrido_mm(500, machine)
    x_min_esperado = -overscan
    assert any(f"X{x_min_esperado:.3f}" in linea for linea in lineas)


def test_offset_desplaza_todo_el_barrido():
    machine = MachineConfig()
    matriz = [[1.0]]
    sin_offset = gcode_grabado_raster(matriz, 10, 10, 0, 0, 500, 100, machine)
    con_offset = gcode_grabado_raster(matriz, 10, 10, 50, 30, 500, 100, machine)
    # Misma cantidad de lineas, coordenadas todas corridas +50/+30.
    assert len(sin_offset) == len(con_offset)


def test_rotacion_90_grados_intercambia_ancho_y_alto_del_recorrido():
    """Con rotacion de 90 grados, el barrido (originalmente horizontal, en el
    eje X local) termina orientado en el eje Y de la maquina -- el rango de
    X que ocupa el resultado se reduce al ancho real de la pieza rotada."""
    machine = MachineConfig()
    matriz = [[1.0] * 4 for _ in range(2)]  # 4mm de ancho local, 2 filas
    sin_rotar = gcode_grabado_raster(matriz, 4, 2, 0, 0, 500, 100, machine)
    rotado = gcode_grabado_raster(matriz, 4, 2, 0, 0, 500, 100, machine, angulo_rad=math.pi / 2)

    def rango_x(lineas: list[str]) -> float:
        xs = [float(tok[1:]) for linea in lineas for tok in linea.split() if tok.startswith("X")]
        return max(xs) - min(xs)

    # Sin rotar, el barrido recorre ~4mm de ancho (+ sobrerecorrido) en X.
    # Rotado 90 grados, ese mismo recorrido pasa a ocupar el eje Y -- el
    # rango en X que queda es el "alto" de la pieza (2mm + overscan), mucho
    # menor que el rango sin rotar.
    assert rango_x(rotado) < rango_x(sin_rotar)
