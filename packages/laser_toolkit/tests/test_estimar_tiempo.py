import pytest

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.estimar_tiempo import estimar_duracion_s, tiempo_fase_s


@pytest.fixture
def machine() -> MachineConfig:
    return MachineConfig(aceleracion_mm_s2=50.0)


def test_tiempo_fase_triangular_para_segmento_corto(machine: MachineConfig):
    # A 3000mm/min (50mm/s) la distancia de aceleracion es 25mm -- un
    # segmento de 10mm nunca llega a velocidad de crucero (perfil triangular).
    t = tiempo_fase_s(10.0, feed_mm_min=3000, aceleracion_mm_s2=machine.aceleracion_mm_s2)
    v_pico = (machine.aceleracion_mm_s2 * 10.0) ** 0.5
    assert t == pytest.approx(2 * v_pico / machine.aceleracion_mm_s2)


def test_tiempo_fase_trapezoidal_para_segmento_largo(machine: MachineConfig):
    # A 3000mm/min la distancia de aceleracion es 25mm -- un segmento de
    # 100mm si llega a velocidad de crucero (perfil trapezoidal).
    t = tiempo_fase_s(100.0, feed_mm_min=3000, aceleracion_mm_s2=machine.aceleracion_mm_s2)
    v = 3000 / 60.0
    d_acel = v**2 / (2 * machine.aceleracion_mm_s2)
    esperado = 2 * (v / machine.aceleracion_mm_s2) + (100.0 - 2 * d_acel) / v
    assert t == pytest.approx(esperado)


def test_tiempo_fase_longitud_o_feed_no_positivo_es_cero(machine: MachineConfig):
    assert tiempo_fase_s(0.0, 3000, machine.aceleracion_mm_s2) == 0.0
    assert tiempo_fase_s(10.0, 0.0, machine.aceleracion_mm_s2) == 0.0


def test_estimar_duracion_de_un_cuadrado_simple(machine: MachineConfig):
    # Cuadrado de 10mm de lado a 3000mm/min, sin M-codes intermedios: una
    # sola fase continua de 40mm (perimetro).
    gcode = [
        "G0 X0.000 Y0.000 F3000",
        "M4 S5000",
        "G1 X10.000 Y0.000 F3000",
        "G1 X10.000 Y10.000 F3000",
        "G1 X0.000 Y10.000 F3000",
        "G1 X0.000 Y0.000 F3000",
        "M5",
    ]
    duracion = estimar_duracion_s(gcode, machine)
    assert duracion == pytest.approx(tiempo_fase_s(40.0, 3000, machine.aceleracion_mm_s2))


def test_estimar_duracion_ignora_comentarios_y_lineas_vacias(machine: MachineConfig):
    gcode = [
        "; comentario suelto",
        "",
        "G0 X0.000 Y0.000 F3000",
        "M4 S5000 ; laser encendido",
        "G1 X10.000 Y0.000 F3000 ; primer lado",
        "M5",
    ]
    duracion = estimar_duracion_s(gcode, machine)
    assert duracion == pytest.approx(tiempo_fase_s(10.0, 3000, machine.aceleracion_mm_s2))


def test_estimar_duracion_aplica_margen_de_curva_con_esquinas_cortas(machine: MachineConfig):
    # Angulo de 90 grados entre dos segmentos de 0.5mm cada uno -- dispara el
    # margen de curvas (angulo > 3 grados Y segmento < 3mm).
    gcode_con_esquina = [
        "G0 X0.000 Y0.000 F3000",
        "M4 S5000",
        "G1 X0.500 Y0.000 F3000",
        "G1 X0.500 Y0.500 F3000",
        "M5",
    ]
    gcode_colineal = [
        "G0 X0.000 Y0.000 F3000",
        "M4 S5000",
        "G1 X0.500 Y0.000 F3000",
        "G1 X1.000 Y0.000 F3000",
        "M5",
    ]
    duracion_con_esquina = estimar_duracion_s(gcode_con_esquina, machine)
    duracion_colineal = estimar_duracion_s(gcode_colineal, machine)
    # Misma longitud total (1mm) en ambos casos -- la diferencia es solo el margen.
    assert duracion_con_esquina == pytest.approx(duracion_colineal * 1.15)


def test_estimar_duracion_sin_lineas_es_cero(machine: MachineConfig):
    assert estimar_duracion_s([], machine) == 0.0


def test_estimar_duracion_movimientos_de_z_no_aportan_tiempo(machine: MachineConfig):
    # G91/G0 Z... (cambio de foco) no lleva X/Y -- no debe sumar distancia.
    gcode = [
        "G91 ; posicionamiento relativo",
        "G0 Z5.000",
        "G90 ; volver a posicionamiento absoluto",
    ]
    assert estimar_duracion_s(gcode, machine) == 0.0
