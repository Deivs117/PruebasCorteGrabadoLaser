"""Emision de G-code compatible con GRBL / LaserGRBL para las operaciones basicas
de una suite de prueba: encabezado/pie, corte de un cuadrado, relleno tipo trama
para grabado y grabado de una etiqueta de texto (ID de celda).

Usa `M4` (laser dinamico, potencia proporcional a la velocidad instantanea) en
vez de `M3`, que es la practica recomendada para GRBL-laser: evita puntos
quemados cuando la maquina desacelera en las esquinas.
"""

from __future__ import annotations

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.grid import Celda
from laser_toolkit.gcode.label_font import trazos_texto

# Parametros por defecto para el grabado de etiquetas de ID: potencia baja y
# velocidad alta, para que el grabado del identificador no compita en tiempo
# ni en efecto termico con la operacion que se esta evaluando en la celda.
POTENCIA_ETIQUETA_PCT = 20
VELOCIDAD_ETIQUETA_MM_MIN = 1500
ALTO_ETIQUETA_MM = 2.0
MARGEN_ETIQUETA_MM = 3.0


def _valor_s(potencia_pct: int, machine: MachineConfig) -> int:
    return round((potencia_pct / 100) * machine.laser_max_s)


def encabezado(comentario: str) -> list[str]:
    return [
        f"; {comentario}",
        "; Generado por laser_toolkit -- no editar a mano, regenerar desde el YAML de configuracion",
        "G21 ; unidades en milimetros",
        "G90 ; posicionamiento absoluto",
        "M5 ; laser apagado por seguridad al iniciar",
    ]


def pie() -> list[str]:
    return [
        "M5 ; laser apagado",
        "G0 X0 Y0 ; volver al origen",
    ]


def cortar_cuadrado(celda: Celda, machine: MachineConfig) -> list[str]:
    """G-code de corte de un cuadrado de `celda.tamano_mm` de lado, en `celda.pasadas`
    pasadas, con esquina inferior izquierda en (`celda.x_mm`, `celda.y_mm`)."""
    s = _valor_s(celda.potencia_pct, machine)
    x0, y0, lado = celda.x_mm, celda.y_mm, celda.tamano_mm

    lineas = [f"G0 X{x0:.3f} Y{y0:.3f} F{machine.travel_feed_mm_min}"]
    for pasada in range(celda.pasadas):
        lineas.append(f"M4 S{s}")
        lineas.append(f"G1 X{x0 + lado:.3f} Y{y0:.3f} F{celda.velocidad_mm_min}")
        lineas.append(f"G1 X{x0 + lado:.3f} Y{y0 + lado:.3f} F{celda.velocidad_mm_min}")
        lineas.append(f"G1 X{x0:.3f} Y{y0 + lado:.3f} F{celda.velocidad_mm_min}")
        lineas.append(f"G1 X{x0:.3f} Y{y0:.3f} F{celda.velocidad_mm_min}")
        lineas.append("M5")
        if pasada < celda.pasadas - 1:
            lineas.append(
                f"; pasada {pasada + 2}/{celda.pasadas}: aplicar z_step_mm de la "
                "configuracion (ajuste manual de Z o G-code M-code segun el firmware)"
            )
    return lineas


def grabar_relleno(celda: Celda, machine: MachineConfig, resolucion_linea_mm: float = 0.1) -> list[str]:
    """G-code de relleno tipo trama (zigzag horizontal) para grabar una celda cuadrada."""
    if resolucion_linea_mm <= 0:
        raise ValueError("resolucion_linea_mm debe ser positiva")

    s = _valor_s(celda.potencia_pct, machine)
    x0, y0, lado = celda.x_mm, celda.y_mm, celda.tamano_mm

    lineas = [f"G0 X{x0:.3f} Y{y0:.3f} F{machine.travel_feed_mm_min}", f"M4 S{s}"]
    y = y0
    ida = True
    while y <= y0 + lado + 1e-9:
        x_destino = x0 + lado if ida else x0
        lineas.append(f"G1 X{x_destino:.3f} Y{y:.3f} F{celda.velocidad_mm_min}")
        y += resolucion_linea_mm
        if y <= y0 + lado + 1e-9:
            lineas.append(f"G0 Y{y:.3f} F{machine.travel_feed_mm_min}")
        ida = not ida
    lineas.append("M5")
    return lineas


def grabar_etiqueta(
    texto: str,
    x_mm: float,
    y_mm: float,
    machine: MachineConfig,
    alto_mm: float = ALTO_ETIQUETA_MM,
    potencia_pct: int = POTENCIA_ETIQUETA_PCT,
    velocidad_mm_min: int = VELOCIDAD_ETIQUETA_MM_MIN,
) -> list[str]:
    """G-code que graba `texto` (el ID de la celda) como texto vectorial pequeno,
    con esquina inferior izquierda en (`x_mm`, `y_mm`)."""
    s = _valor_s(potencia_pct, machine)
    trazos = trazos_texto(texto, alto_mm=alto_mm, espaciado_mm=alto_mm * 0.2)

    lineas: list[str] = []
    for (dx0, dy0), (dx1, dy1) in trazos:
        lineas.append(f"G0 X{x_mm + dx0:.3f} Y{y_mm + dy0:.3f} F{machine.travel_feed_mm_min}")
        lineas.append(f"M4 S{s}")
        lineas.append(f"G1 X{x_mm + dx1:.3f} Y{y_mm + dy1:.3f} F{velocidad_mm_min}")
        lineas.append("M5")
    return lineas
