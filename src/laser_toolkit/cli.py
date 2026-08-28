"""Interfaz de linea de comandos de laser_toolkit.

uv run laser-toolkit generate-cut configs/mdf_3mm_corte.yaml
uv run laser-toolkit generate-engrave configs/mdf_3mm_grabado.yaml
uv run laser-toolkit prepare-record data/registros/<corrida>.csv
uv run laser-toolkit compute-costs data/registros/<corrida>_registro.csv --tarifas configs/tarifas.yaml
"""

from __future__ import annotations

from pathlib import Path

import typer

from laser_toolkit.config import MachineConfig, SuiteConfig
from laser_toolkit.io.csv_export import CAMPOS_CSV, escribir_csv, escribir_csv_columnas, leer_csv
from laser_toolkit.io.registro import (
    COLUMNAS_COSTEO,
    COLUMNAS_MANUALES,
    calcular_costos_registro,
    preparar_registro,
)
from laser_toolkit.naming import nombre_base
from laser_toolkit.suites.cut import generar_suite_corte
from laser_toolkit.suites.engrave import generar_suite_grabado
from laser_toolkit.tarifas import TarifasConfig

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


@app.command("prepare-record")
def prepare_record(
    csv_generado: Path = typer.Argument(
        ..., exists=True, help="csv hermano ya generado por generate-cut / generate-engrave."
    ),
    salida: Path = typer.Option(
        None, "--salida", "-o", help="Ruta del csv de registro. Por defecto: <csv_generado>_registro.csv"
    ),
) -> None:
    """Agrega al csv generado las columnas que se completan a mano tras correr
    la corrida en la maquina (medicion de energia/tiempo, evaluacion visual)."""
    filas = leer_csv(csv_generado)
    filas_preparadas = preparar_registro(filas)
    ruta_salida = salida or csv_generado.with_name(f"{csv_generado.stem}_registro.csv")
    escribir_csv_columnas(filas_preparadas, CAMPOS_CSV + COLUMNAS_MANUALES, ruta_salida)
    typer.echo(f"Registro preparado: {ruta_salida}")
    typer.echo(f"Completar a mano: {', '.join(COLUMNAS_MANUALES)}")


@app.command("compute-costs")
def compute_costs(
    registro_csv: Path = typer.Argument(
        ..., exists=True, help="csv de registro ya completado (ver prepare-record)."
    ),
    tarifas_path: Path = typer.Option(
        ..., "--tarifas", exists=True, help="YAML de tarifas de negocio (ver configs/tarifas.example.yaml)."
    ),
    config_maquina: Path = typer.Option(
        None,
        "--config-maquina",
        help="YAML de una SuiteConfig, para tomar sus parametros `machine` (potencia nominal, "
        "factor de utilizacion). Si se omite, usa los valores por defecto de MachineConfig.",
    ),
    salida: Path = typer.Option(
        None, "--salida", "-o", help="Ruta del csv con costeo. Por defecto: <registro_csv>_costeado.csv"
    ),
) -> None:
    """Calcula el costeo granular (energia, material, tiempo de maquina) de un
    registro ya completado, separando siempre los tres componentes."""
    filas = leer_csv(registro_csv)
    tarifas = TarifasConfig.from_yaml(tarifas_path)
    machine = SuiteConfig.from_yaml(config_maquina).machine if config_maquina else MachineConfig()

    filas_costeadas = calcular_costos_registro(filas, tarifas, machine)
    ruta_salida = salida or registro_csv.with_name(f"{registro_csv.stem}_costeado.csv")
    escribir_csv_columnas(filas_costeadas, CAMPOS_CSV + COLUMNAS_MANUALES + COLUMNAS_COSTEO, ruta_salida)
    typer.echo(f"Costeo calculado: {ruta_salida}")

    pendientes = [
        nombre
        for nombre in ("tarifa_electrica_por_kwh", "tarifa_hora_maquina")
        if getattr(tarifas, nombre) is None
    ]
    if pendientes or not tarifas.precio_material_por_m2:
        typer.echo(
            f"Nota: hay tarifas sin definir en {tarifas_path} -- las columnas de costo "
            "correspondientes quedan vacias en vez de asumir un valor."
        )


def main() -> None:
    app()


if __name__ == "__main__":
    main()
