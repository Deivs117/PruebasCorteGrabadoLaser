"""Orquestacion de una suite de CORTE: arma el G-code completo y las filas del
csv hermano a partir de una `SuiteConfig` ya validada.
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import MachineConfig, SuiteConfig
from laser_toolkit.gcode.grid import construir_grilla
from laser_toolkit.gcode.timing import tiempo_corte_celda_s
from laser_toolkit.gcode.writer import cortar_cuadrado, encabezado, grabar_etiqueta, pie, tamano_etiqueta_mm
from laser_toolkit.naming import nombre_base
from laser_toolkit.svg.api import cargar_subpaths_svg, tiempo_estimado_svg_s
from laser_toolkit.svg.gcode import gcode_contorno
from laser_toolkit.svg.geometry import Subpath
from laser_toolkit.svg.modo import ModoGrabadoSvg


def _gcode_contorno_svg_celda(
    subpaths: list[Subpath],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    pasadas: int,
    machine: MachineConfig,
) -> list[str]:
    """Corta el contorno de `subpaths` en `pasadas` repeticiones -- mismo patron
    que `cortar_cuadrado` (un material grueso necesita varias pasadas para cortar
    de punta a punta, no solo una). `modo_grabado_svg` no aplica aca: cortar
    siempre traza solo el contorno, nunca un relleno tipo trama."""
    gcode: list[str] = []
    for pasada in range(pasadas):
        gcode += gcode_contorno(subpaths, x_offset_mm, y_offset_mm, velocidad_mm_min, potencia_pct, machine)
        if pasada < pasadas - 1:
            gcode.append(
                f"; pasada {pasada + 2}/{pasadas}: aplicar z_step_mm de la "
                "configuracion (ajuste manual de Z o G-code M-code segun el firmware)"
            )
    return gcode


def generar_suite_corte(config: SuiteConfig) -> tuple[list[str], list[dict]]:
    """Devuelve `(lineas_gcode, filas_csv)` para la suite de corte descrita en `config`.

    Si `config.svg_path` esta definido, cada celda corta el CONTORNO de ese SVG
    (escalado a `tamano_celda_mm`) en vez de un cuadrado generico -- la geometria
    se carga y escala UNA sola vez (es la misma en todas las celdas; solo cambian
    velocidad y potencia por celda), mismo patron que
    `laser_toolkit.suites.engrave.generar_suite_grabado`.
    """
    celdas = construir_grilla(config)
    fecha = config.fecha or date.today().isoformat()
    corrida_id = nombre_base(config)

    subpaths_svg = (
        cargar_subpaths_svg(config.svg_path, config.tamano_celda_mm, config.tamano_celda_mm)
        if config.svg_path
        else None
    )

    gcode = encabezado(f"Suite de CORTE -- {config.material} {config.espesor_mm}mm -- lote {config.lote}")
    filas: list[dict] = []
    margen_etiqueta_mm, alto_etiqueta_mm = tamano_etiqueta_mm(config.espaciado_mm)

    for celda in celdas:
        if subpaths_svg is not None:
            gcode += _gcode_contorno_svg_celda(
                subpaths_svg,
                celda.x_mm,
                celda.y_mm,
                celda.velocidad_mm_min,
                celda.potencia_pct,
                celda.pasadas,
                config.machine,
            )
            tiempo_s = (
                tiempo_estimado_svg_s(subpaths_svg, celda.velocidad_mm_min, modo=ModoGrabadoSvg.CONTORNO)
                * celda.pasadas
            )
        else:
            gcode += cortar_cuadrado(celda, config.machine)
            tiempo_s = tiempo_corte_celda_s(celda)

        gcode += grabar_etiqueta(
            celda.id,
            x_mm=celda.x_mm,
            # Arriba de la celda (dentro del espaciado hacia la fila siguiente): a
            # diferencia de "debajo", esto nunca cae en Y negativo para la fila 0.
            # margen/alto se reducen si `espaciado_mm` es chico, para no invadir
            # la celda de la fila de arriba (ver `tamano_etiqueta_mm`).
            y_mm=celda.y_mm + celda.tamano_mm + margen_etiqueta_mm,
            machine=config.machine,
            alto_mm=alto_etiqueta_mm,
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
                # El corte remueve toda el area de la celda (incluye el desperdicio
                # de la grilla, no solo la pieza util, sea cuadrado generico o el
                # contorno de un SVG): es la cantidad fisica que el area financiera
                # multiplica por su propio precio de material.
                "area_material_mm2": celda.tamano_mm**2,
                "tiempo_estimado_celda_s": round(tiempo_s, 2),
            }
        )

    gcode += pie()
    return gcode, filas
