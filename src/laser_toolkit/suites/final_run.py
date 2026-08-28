"""Orquestacion de una Final Run (Plan Maestro, seccion 8): UNA combinacion
fija de parametros de produccion, repetida en celdas fisicamente identicas,
para medir su consumo energetico sin la aproximacion de peso por tiempo que
usa una suite de barrido (`laser_toolkit.suites.cut` / `.engrave`).
"""

from __future__ import annotations

from datetime import date

from laser_toolkit.config import FinalRunConfig, Operacion
from laser_toolkit.gcode.grid import Celda
from laser_toolkit.gcode.timing import tiempo_corte_celda_s, tiempo_grabado_celda_s
from laser_toolkit.gcode.writer import (
    MARGEN_ETIQUETA_MM,
    cortar_cuadrado,
    encabezado,
    grabar_etiqueta,
    grabar_relleno,
    pie,
)
from laser_toolkit.naming import id_grupo_calibracion


def construir_replicas(config: FinalRunConfig) -> list[Celda]:
    """Arma `config.repeticiones` celdas fisicas identicas (misma velocidad y
    potencia) en una grilla compacta serpenteada de hasta 6 columnas."""
    paso = config.tamano_celda_mm + config.espaciado_mm
    n_columnas = min(config.repeticiones, 6)

    celdas: list[Celda] = []
    for i in range(config.repeticiones):
        fila, columna = divmod(i, n_columnas)
        columna_real = columna if fila % 2 == 0 else n_columnas - 1 - columna
        celdas.append(
            Celda(
                id=f"{config.id_prefijo}-{i + 1:03d}",
                velocidad_mm_min=config.velocidad_mm_min,
                potencia_pct=config.potencia_pct,
                pasadas=config.pasadas,
                x_mm=columna_real * paso,
                y_mm=fila * paso,
                tamano_mm=config.tamano_celda_mm,
            )
        )
    return celdas


def generar_final_run(config: FinalRunConfig) -> tuple[list[str], list[dict]]:
    """Devuelve `(lineas_gcode, filas_csv)` para una ejecucion de Final Run."""
    celdas = construir_replicas(config)
    fecha = config.fecha or date.today().isoformat()
    grupo = id_grupo_calibracion(config)
    corrida_id = f"{grupo}_ejec{config.ejecucion}"

    gcode = encabezado(f"FINAL RUN -- {grupo} -- ejecucion {config.ejecucion}")
    filas: list[dict] = []

    for celda in celdas:
        if config.operacion is Operacion.CORTE:
            gcode += cortar_cuadrado(celda, config.machine)
            tiempo_s = tiempo_corte_celda_s(celda)
            area_mm2 = celda.tamano_mm**2
        else:
            gcode += grabar_relleno(celda, config.machine)
            tiempo_s = tiempo_grabado_celda_s(celda)
            area_mm2 = 0.0

        gcode += grabar_etiqueta(
            celda.id,
            x_mm=celda.x_mm,
            y_mm=celda.y_mm + celda.tamano_mm + MARGEN_ETIQUETA_MM,
            machine=config.machine,
        )
        filas.append(
            {
                "corrida_id": corrida_id,
                "grupo_calibracion_id": grupo,
                "ejecucion": config.ejecucion,
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
                "area_material_mm2": area_mm2,
                "tiempo_estimado_celda_s": round(tiempo_s, 2),
            }
        )

    gcode += pie()
    return gcode, filas
