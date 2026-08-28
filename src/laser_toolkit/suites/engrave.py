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


def generar_suite_grabado(config: SuiteConfig) -> tuple[list[str], list[dict]]:
    """Devuelve `(lineas_gcode, filas_csv)` para la suite de grabado descrita en `config`."""
    celdas = construir_grilla(config)
    fecha = config.fecha or date.today().isoformat()
    corrida_id = nombre_base(config)

    gcode = encabezado(f"Suite de GRABADO -- {config.material} {config.espesor_mm}mm -- lote {config.lote}")
    filas: list[dict] = []

    for celda in celdas:
        gcode += grabar_relleno(celda, config.machine)
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
                "tiempo_estimado_celda_s": round(tiempo_grabado_celda_s(celda), 2),
            }
        )

    gcode += pie()
    return gcode, filas
