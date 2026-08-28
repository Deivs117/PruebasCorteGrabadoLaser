"""Orquestacion de una suite de GRABADO: arma el G-code completo y las filas del
csv hermano a partir de una `SuiteConfig` ya validada.
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import SuiteConfig
from laser_toolkit.gcode.grid import construir_grilla
from laser_toolkit.gcode.timing import tiempo_grabado_celda_s
from laser_toolkit.gcode.writer import MARGEN_ETIQUETA_MM, encabezado, grabar_etiqueta, grabar_relleno, pie
from laser_toolkit.naming import nombre_base
from laser_toolkit.svg.api import cargar_subpaths_svg, tiempo_estimado_svg_s
from laser_toolkit.svg.fill import generar_segmentos_relleno
from laser_toolkit.svg.gcode import gcode_contorno, gcode_relleno
from laser_toolkit.svg.geometry import Subpath
from laser_toolkit.svg.modo import ModoGrabadoSvg


def _gcode_svg_celda(
    subpaths: list[Subpath],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    config: SuiteConfig,
) -> list[str]:
    gcode: list[str] = []
    modo = config.modo_grabado_svg
    if modo in (ModoGrabadoSvg.CONTORNO, ModoGrabadoSvg.CONTORNO_Y_RELLENO):
        gcode += gcode_contorno(
            subpaths, x_offset_mm, y_offset_mm, velocidad_mm_min, potencia_pct, config.machine
        )
    if modo in (ModoGrabadoSvg.RELLENO, ModoGrabadoSvg.CONTORNO_Y_RELLENO):
        segmentos = generar_segmentos_relleno(subpaths, config.svg_resolucion_relleno_mm)
        gcode += gcode_relleno(
            segmentos, x_offset_mm, y_offset_mm, velocidad_mm_min, potencia_pct, config.machine
        )
    return gcode


def generar_suite_grabado(config: SuiteConfig) -> tuple[list[str], list[dict]]:
    """Devuelve `(lineas_gcode, filas_csv)` para la suite de grabado descrita en `config`.

    Si `config.svg_path` esta definido, cada celda graba ese SVG (escalado a
    `tamano_celda_mm`) en vez del relleno generico tipo trama -- la geometria
    se carga y escala UNA sola vez (es la misma en todas las celdas; solo
    cambian velocidad y potencia por celda), ver `laser_toolkit.svg`.
    """
    celdas = construir_grilla(config)
    fecha = config.fecha or date.today().isoformat()
    corrida_id = nombre_base(config)

    subpaths_svg = (
        cargar_subpaths_svg(config.svg_path, config.tamano_celda_mm, config.tamano_celda_mm)
        if config.svg_path
        else None
    )

    gcode = encabezado(f"Suite de GRABADO -- {config.material} {config.espesor_mm}mm -- lote {config.lote}")
    filas: list[dict] = []

    for celda in celdas:
        if subpaths_svg is not None:
            gcode += _gcode_svg_celda(
                subpaths_svg, celda.x_mm, celda.y_mm, celda.velocidad_mm_min, celda.potencia_pct, config
            )
            tiempo_s = tiempo_estimado_svg_s(
                subpaths_svg,
                celda.velocidad_mm_min,
                modo=config.modo_grabado_svg,
                resolucion_relleno_mm=config.svg_resolucion_relleno_mm,
            )
        else:
            gcode += grabar_relleno(celda, config.machine)
            tiempo_s = tiempo_grabado_celda_s(celda)

        gcode += grabar_etiqueta(
            celda.id,
            x_mm=celda.x_mm,
            # Arriba de la celda (dentro del espaciado hacia la fila siguiente): a
            # diferencia de "debajo", esto nunca cae en Y negativo para la fila 0.
            y_mm=celda.y_mm + celda.tamano_mm + MARGEN_ETIQUETA_MM,
            machine=config.machine,
        )
        filas.append(
            {
                "corrida_id": corrida_id,
                "grupo_calibracion_id": "",
                "ejecucion": "",
                "id_prueba": celda.id,
                "lote": config.lote,
                "fecha": fecha,
                "material": config.material,
                "espesor_mm": config.espesor_mm,
                "operacion": config.operacion.value,
                "velocidad_mm_min": celda.velocidad_mm_min,
                "potencia_pct": celda.potencia_pct,
                "pasadas": celda.pasadas,
                "x_mm": celda.x_mm,
                "y_mm": celda.y_mm,
                "tamano_celda_mm": celda.tamano_mm,
                # El grabado no remueve material -- la cantidad fisica de material
                # consumida es cero (Plan Maestro, seccion 6.2).
                "area_material_mm2": 0.0,
                "tiempo_estimado_celda_s": round(tiempo_s, 2),
            }
        )

    gcode += pie()
    return gcode, filas
