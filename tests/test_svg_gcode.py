import pytest

from laser_toolkit.config import MachineConfig
from laser_toolkit.svg.gcode import gcode_contorno, gcode_relleno, longitud_contorno_mm, longitud_relleno_mm
from laser_toolkit.svg.geometry import Subpath


def test_gcode_contorno_cierra_subpath_cerrado():
    sp = Subpath(puntos=((0, 0), (10, 0), (10, 10)), cerrado=True)
    lineas = gcode_contorno([sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig())
    assert lineas[-2] == "G1 X0.000 Y0.000 F500"  # vuelve al punto inicial
    assert lineas[-1] == "M5"


def test_gcode_contorno_no_cierra_subpath_abierto():
    sp = Subpath(puntos=((0, 0), (10, 0), (10, 10)), cerrado=False)
    lineas = gcode_contorno([sp], 0, 0, velocidad_mm_min=500, potencia_pct=50, machine=MachineConfig())
    assert "X0.000 Y0.000 F500" not in lineas[2:]  # no vuelve al origen


def test_gcode_contorno_aplica_offset():
    sp = Subpath(puntos=((0, 0), (10, 0)), cerrado=False)
    lineas = gcode_contorno(
        [sp], x_offset_mm=100, y_offset_mm=50, velocidad_mm_min=500, potencia_pct=100, machine=MachineConfig()
    )
    assert lineas[0].startswith("G0 X100.000 Y50.000")
    assert "X110.000 Y50.000" in lineas[-2]


def test_gcode_relleno_usa_s_segun_potencia():
    machine = MachineConfig(laser_max_s=1000)
    lineas = gcode_relleno(
        [((0.0, 0.0), (10.0, 0.0))], 0, 0, velocidad_mm_min=1000, potencia_pct=25, machine=machine
    )
    assert "M4 S250" in lineas


def test_longitud_contorno_cuadrado_cerrado():
    sp = Subpath(puntos=((0, 0), (10, 0), (10, 10), (0, 10)), cerrado=True)
    assert longitud_contorno_mm([sp]) == pytest.approx(40.0)


def test_longitud_relleno_suma_segmentos():
    segmentos = [((0.0, 0.0), (10.0, 0.0)), ((0.0, 1.0), (5.0, 1.0))]
    assert longitud_relleno_mm(segmentos) == pytest.approx(15.0)
