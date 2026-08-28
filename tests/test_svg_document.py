from pathlib import Path

import pytest

from laser_toolkit.svg.document import parsear_svg

RAIZ_REPO = Path(__file__).resolve().parent.parent
LOGO_EMPRESA = RAIZ_REPO / "assets" / "svg" / "logo-empresa.svg"


def _escribir_svg(tmp_path: Path, contenido: str) -> Path:
    ruta = tmp_path / "prueba.svg"
    ruta.write_text(contenido, encoding="utf-8")
    return ruta


def test_parsea_viewbox_y_path(tmp_path: Path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <path d="M0,0 L100,0 L100,50 L0,50 Z"/>
    </svg>"""
    subpaths, viewbox = parsear_svg(_escribir_svg(tmp_path, svg))
    assert viewbox == (0.0, 0.0, 100.0, 50.0)
    assert len(subpaths) == 1


def test_parsea_ellipse(tmp_path: Path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="100" rx="50" ry="30"/>
    </svg>"""
    subpaths, _ = parsear_svg(_escribir_svg(tmp_path, svg))
    assert len(subpaths) == 1
    xs = [p[0] for p in subpaths[0].puntos]
    assert max(xs) - min(xs) == pytest.approx(100, abs=1)  # 2*rx


def test_parsea_rect_y_circle(tmp_path: Path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="10" width="20" height="30"/>
        <circle cx="50" cy="50" r="10"/>
    </svg>"""
    subpaths, _ = parsear_svg(_escribir_svg(tmp_path, svg))
    assert len(subpaths) == 2


def test_elemento_con_transform_levanta_error(tmp_path: Path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <g transform="translate(10,10)">
            <path d="M0,0 L10,0"/>
        </g>
    </svg>"""
    with pytest.raises(ValueError, match="transform"):
        parsear_svg(_escribir_svg(tmp_path, svg))


def test_sin_formas_soportadas_levanta_error(tmp_path: Path):
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>'
    with pytest.raises(ValueError, match="no se encontraron"):
        parsear_svg(_escribir_svg(tmp_path, svg))


@pytest.mark.skipif(not LOGO_EMPRESA.exists(), reason="assets/svg/logo-empresa.svg no esta presente")
def test_logo_empresa_real_parsea_sin_errores():
    """Integracion: el archivo real de la empresa (2 paths con curvas + 1 ellipse)."""
    subpaths, viewbox = parsear_svg(LOGO_EMPRESA)
    assert viewbox == (0.0, 0.0, 800.0, 800.0)
    assert len(subpaths) == 3
    assert all(len(sp.puntos) >= 3 for sp in subpaths)
