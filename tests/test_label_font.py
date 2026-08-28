import pytest

from laser_toolkit.gcode.label_font import trazos_texto


def test_trazos_no_vacios_para_id_valido():
    trazos = trazos_texto("C-014", alto_mm=2.0, espaciado_mm=0.4)
    assert len(trazos) > 0


def test_caracter_no_soportado_levanta_error():
    with pytest.raises(ValueError):
        trazos_texto("C-014?", alto_mm=2.0, espaciado_mm=0.4)


def test_alto_no_positivo_levanta_error():
    with pytest.raises(ValueError):
        trazos_texto("C-001", alto_mm=0, espaciado_mm=0.4)


def test_espacio_avanza_cursor_sin_generar_trazos():
    solo_espacio = trazos_texto(" ", alto_mm=2.0, espaciado_mm=0.4)
    assert solo_espacio == []
