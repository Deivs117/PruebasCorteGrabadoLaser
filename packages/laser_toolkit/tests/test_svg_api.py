from pathlib import Path

import pytest

from laser_toolkit.config import MachineConfig
from laser_toolkit.svg.api import (
    ModoGrabadoSvg,
    cargar_subpaths_svg,
    convertir_svg_a_gcode,
    tiempo_estimado_svg_s,
)

RAIZ_REPO = Path(__file__).resolve().parent.parent
LOGO_EMPRESA = RAIZ_REPO / "assets" / "svg" / "logo-empresa.svg"


def _svg_cuadrado(tmp_path: Path) -> Path:
    ruta = tmp_path / "cuadrado.svg"
    ruta.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        '<path d="M0,0 L100,0 L100,100 L0,100 Z"/>'
        "</svg>",
        encoding="utf-8",
    )
    return ruta


def test_cargar_subpaths_svg_escala_a_la_caja_pedida(tmp_path: Path):
    subpaths = cargar_subpaths_svg(_svg_cuadrado(tmp_path), ancho_mm=20, alto_mm=20)
    xs = [p[0] for p in subpaths[0].puntos]
    assert max(xs) - min(xs) == pytest.approx(20)


def test_convertir_svg_a_gcode_modo_contorno(tmp_path: Path):
    gcode = convertir_svg_a_gcode(
        _svg_cuadrado(tmp_path),
        ancho_mm=10,
        alto_mm=10,
        velocidad_mm_min=500,
        potencia_pct=50,
        machine=MachineConfig(),
        modo=ModoGrabadoSvg.CONTORNO,
    )
    assert any(linea.startswith("M4") for linea in gcode)
    assert any(linea.startswith("G1") for linea in gcode)


def test_convertir_svg_a_gcode_modo_relleno_produce_mas_lineas_que_contorno(tmp_path: Path):
    ruta = _svg_cuadrado(tmp_path)
    machine = MachineConfig()
    gcode_contorno = convertir_svg_a_gcode(
        ruta, 10, 10, 500, 50, machine, modo=ModoGrabadoSvg.CONTORNO, resolucion_relleno_mm=1.0
    )
    gcode_ambos = convertir_svg_a_gcode(
        ruta, 10, 10, 500, 50, machine, modo=ModoGrabadoSvg.CONTORNO_Y_RELLENO, resolucion_relleno_mm=1.0
    )
    assert len(gcode_ambos) > len(gcode_contorno)


def test_tiempo_estimado_escala_inversamente_con_velocidad(tmp_path: Path):
    subpaths = cargar_subpaths_svg(_svg_cuadrado(tmp_path), ancho_mm=10, alto_mm=10)
    tiempo_lento = tiempo_estimado_svg_s(subpaths, velocidad_mm_min=100, modo=ModoGrabadoSvg.CONTORNO)
    tiempo_rapido = tiempo_estimado_svg_s(subpaths, velocidad_mm_min=200, modo=ModoGrabadoSvg.CONTORNO)
    assert tiempo_lento == pytest.approx(tiempo_rapido * 2)


@pytest.mark.skipif(not LOGO_EMPRESA.exists(), reason="assets/svg/logo-empresa.svg no esta presente")
def test_logo_empresa_convierte_a_gcode_sin_errores():
    gcode = convertir_svg_a_gcode(
        LOGO_EMPRESA,
        ancho_mm=30,
        alto_mm=30,
        velocidad_mm_min=1200,
        potencia_pct=25,
        machine=MachineConfig(),
    )
    assert len(gcode) > 0
    assert all(isinstance(linea, str) for linea in gcode)
