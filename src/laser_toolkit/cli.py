"""Interfaz de linea de comandos de laser_toolkit.

    uv run laser-toolkit generate-cut configs/mdf_3mm_corte.yaml
    uv run laser-toolkit generate-engrave configs/mdf_3mm_grabado.yaml
"""

from __future__ import annotations

from pathlib import Path

import typer

from laser_toolkit.config import SuiteConfig
from laser_toolkit.io.csv_export import escribir_csv
from laser_toolkit.naming import nombre_base
from laser_toolkit.suites.cut import generar_suite_corte
from laser_toolkit.suites.engrave import generar_suite_grabado

app = typer.Typer(
    help="Genera suites de prueba de corte y grabado laser (G-code GRBL + csv hermano) a partir de un YAML."
)


def _guardar(salida: Path, gcode: list[str], filas: list[dict], config: SuiteConfig) -> None:
    salida.mkdir(parents=True, exist_ok=True)
    base = nombre_base(config)
    ruta_gcode = salida / f"{base}.gcode"
    ruta_csv = salida / f"{base}.csv"

    ruta_gcode.write_text("\n".join(gcode) + "\n", encoding="utf-8")
    escribir_csv(filas, ruta_csv)

    typer.echo(f"G-code generado: {ruta_gcode}")
    typer.echo(f"CSV hermano generado: {ruta_csv} ({len(filas)} celdas)")


@app.command("generate-cut")
def generate_cut(
    config_path: Path = typer.Argument(..., exists=True, help="Ruta al YAML de configuracion de la suite."),
    salida: Path = typer.Option(Path("data/registros"), "--salida", "-o", help="Carpeta de salida."),
) -> None:
    """Genera una suite de CORTE (grilla velocidad x potencia) a partir de un YAML de configuracion."""
    config = SuiteConfig.from_yaml(config_path)
    gcode, filas = generar_suite_corte(config)
    _guardar(salida, gcode, filas, config)


@app.command("generate-engrave")
def generate_engrave(
    config_path: Path = typer.Argument(..., exists=True, help="Ruta al YAML de configuracion de la suite."),
    salida: Path = typer.Option(Path("data/registros"), "--salida", "-o", help="Carpeta de salida."),
) -> None:
    """Genera una suite de GRABADO (grilla velocidad x potencia) a partir de un YAML de configuracion."""
    config = SuiteConfig.from_yaml(config_path)
    gcode, filas = generar_suite_grabado(config)
    _guardar(salida, gcode, filas, config)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
