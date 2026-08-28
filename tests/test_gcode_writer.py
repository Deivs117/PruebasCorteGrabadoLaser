from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.grid import Celda
from laser_toolkit.gcode.writer import cortar_cuadrado, grabar_relleno


def _celda(**overrides: object) -> Celda:
    base = dict(
        id="C-001",
        velocidad_mm_min=240,
        potencia_pct=100,
        pasadas=1,
        x_mm=10.0,
        y_mm=10.0,
        tamano_mm=15.0,
    )
    base.update(overrides)
    return Celda(**base)


def test_cortar_cuadrado_usa_s_maximo_a_100_por_ciento():
    machine = MachineConfig(laser_max_s=1000)
    lineas = cortar_cuadrado(_celda(potencia_pct=100), machine)
    assert "M4 S1000" in lineas


def test_cortar_cuadrado_escala_s_con_potencia():
    machine = MachineConfig(laser_max_s=1000)
    lineas = cortar_cuadrado(_celda(potencia_pct=50), machine)
    assert "M4 S500" in lineas


def test_cortar_cuadrado_repite_bloque_por_cada_pasada():
    machine = MachineConfig()
    lineas_una = cortar_cuadrado(_celda(pasadas=1), machine)
    lineas_dos = cortar_cuadrado(_celda(pasadas=2), machine)
    assert lineas_una.count("M5") == 1
    assert lineas_dos.count("M5") == 2


def test_cortar_cuadrado_apaga_laser_al_final():
    machine = MachineConfig()
    lineas = cortar_cuadrado(_celda(), machine)
    assert lineas[-1] == "M5"


def test_grabar_relleno_apaga_laser_al_final():
    machine = MachineConfig()
    lineas = grabar_relleno(_celda(), machine, resolucion_linea_mm=1.0)
    assert lineas[-1] == "M5"
    assert lineas[1].startswith("M4 S")
