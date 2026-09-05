import pytest

from laser_toolkit.gcode.grid import Celda
from laser_toolkit.gcode.timing import (
    tiempo_corte_celda_s,
    tiempo_desplazamiento_s,
    tiempo_grabado_celda_s,
)


def _celda(
    *,
    id: str = "C-001",
    velocidad_mm_min: int = 240,
    potencia_pct: int = 100,
    pasadas: int = 1,
    x_mm: float = 0.0,
    y_mm: float = 0.0,
    tamano_mm: float = 15.0,
) -> Celda:
    return Celda(
        id=id,
        velocidad_mm_min=velocidad_mm_min,
        potencia_pct=potencia_pct,
        pasadas=pasadas,
        x_mm=x_mm,
        y_mm=y_mm,
        tamano_mm=tamano_mm,
    )


def test_tiempo_corte_una_pasada():
    celda = _celda(tamano_mm=15.0, velocidad_mm_min=240, pasadas=1)
    # perimetro = 60 mm a 240 mm/min -> 0.25 min = 15 s
    assert tiempo_corte_celda_s(celda) == pytest.approx(15.0)


def test_tiempo_corte_escala_con_pasadas():
    una_pasada = tiempo_corte_celda_s(_celda(pasadas=1))
    dos_pasadas = tiempo_corte_celda_s(_celda(pasadas=2))
    assert dos_pasadas == pytest.approx(una_pasada * 2)


def test_tiempo_grabado_mayor_a_cero():
    celda = _celda(velocidad_mm_min=1200)
    assert tiempo_grabado_celda_s(celda) > 0


def test_tiempo_desplazamiento():
    assert tiempo_desplazamiento_s(distancia_mm=100, feed_mm_min=3000) == pytest.approx(2.0)


def test_tiempo_desplazamiento_feed_invalido():
    with pytest.raises(ValueError):
        tiempo_desplazamiento_s(distancia_mm=100, feed_mm_min=0)
