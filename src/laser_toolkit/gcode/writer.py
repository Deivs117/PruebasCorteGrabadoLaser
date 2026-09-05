"""Emision de G-code compatible con GRBL / LaserGRBL para las operaciones basicas
de una suite de prueba: encabezado/pie, corte de un cuadrado, relleno tipo trama
para grabado y grabado de una etiqueta de texto (ID de celda).

Usa `M4` (laser dinamico, potencia proporcional a la velocidad instantanea) en
vez de `M3`, que es la practica recomendada para GRBL-laser: evita puntos
quemados cuando la maquina desacelera en las esquinas.
"""

from __future__ import annotations

from laser_toolkit.config import MachineConfig, SuiteConfig
from laser_toolkit.gcode.grid import Celda
from laser_toolkit.gcode.label_font import trazos_texto

# Parametros por defecto para el grabado de etiquetas de ID: potencia baja y
# velocidad alta, para que el grabado del identificador no compita en tiempo
# ni en efecto termico con la operacion que se esta evaluando en la celda.
POTENCIA_ETIQUETA_PCT = 20
VELOCIDAD_ETIQUETA_MM_MIN = 1500
ALTO_ETIQUETA_MM = 2.0
MARGEN_ETIQUETA_MM = 3.0

# Piso legible: por debajo de esto la etiqueta deja de ser un ID reconocible
# a simple vista (glifos de siete-segmentos ilegibles) o el trazo queda a un
# pelo del borde de la celda.
ALTO_ETIQUETA_MIN_MM = 1.0
MARGEN_ETIQUETA_MIN_MM = 0.5
# Colchon que se resta del espaciado disponible antes de repartirlo entre
# margen y alto: evita que la etiqueta quede tocando exactamente el borde de
# la celda de la fila siguiente (redondeos de float, imprecision mecanica).
_BUFFER_ETIQUETA_MM = 0.3

# Sobre-recorrido (overscan) del relleno tipo trama: cada linea de barrido
# entra y sale de la celda por fuera del area visible (laser apagado) para que
# la maquina ya este acelerando/en velocidad de crucero cuando el haz se
# enciende sobre el material real. Sin esto, cada linea arranca y frena en
# seco justo en el borde visible de la celda: la cabeza pasa mucho mas tiempo
# cerca de velocidad cero en los bordes que en el centro, y como esa velocidad
# entra en la formula de energia por milimetro (potencia / velocidad), los
# bordes quedan sobre-quemados frente a un centro apenas marcado (el patron de
# "valle en los bordes, montania al centro" que se ve a simple vista si esto
# no se compensa). Topado para no generar recorridos absurdos en celdas chicas
# donde la cinematica pediria mucho mas de lo que la celda mide.
SOBRERECORRIDO_MIN_MM = 0.5
SOBRERECORRIDO_MAX_MM = 5.0


def distancia_aceleracion_mm(velocidad_mm_min: float, machine: MachineConfig) -> float:
    """Distancia (mm) que la maquina necesita para pasar de velocidad cero a
    `velocidad_mm_min`, a la aceleracion configurada (`machine.aceleracion_mm_s2`,
    espejo de $120/$121 de GRBL): `d = v^2 / (2a)`.

    Con celdas chicas (ej. una cuadricula de shades de 7mm) y velocidades altas
    esta distancia facilmente supera el ancho de la celda entera -- por eso
    `grabar_relleno` la usa como base del sobre-recorrido, pero siempre topada
    a `SOBRERECORRIDO_MAX_MM`: mas alla de ese tope, agrandar el sobre-recorrido
    ya no vale el tiempo de maquina extra.
    """
    velocidad_mm_s = velocidad_mm_min / 60
    return (velocidad_mm_s**2) / (2 * machine.aceleracion_mm_s2)


def sobrerecorrido_mm(velocidad_mm_min: float, machine: MachineConfig) -> float:
    """Sobre-recorrido (overscan) real que usa `grabar_relleno` para una celda a
    `velocidad_mm_min`: `distancia_aceleracion_mm` topada entre `SOBRERECORRIDO_MIN_MM`
    y `SOBRERECORRIDO_MAX_MM`."""
    return min(
        max(distancia_aceleracion_mm(velocidad_mm_min, machine), SOBRERECORRIDO_MIN_MM),
        SOBRERECORRIDO_MAX_MM,
    )


def margen_seguridad_columna_cero_mm(velocidades_mm_min: list[int], machine: MachineConfig) -> float:
    """Cuanto hay que correr toda la grilla en X (`construir_grilla(..., origen_x_mm=...)`)
    para que la columna 0 tenga el mismo sobre-recorrido hacia la izquierda que
    cualquier otra columna, en vez de que `grabar_relleno` lo recorte contra X=0.

    Usa la velocidad mas alta de la suite (el peor caso: el sobre-recorrido que
    mas espacio pide) para que ninguna celda de la columna 0, sin importar su
    fila/velocidad real, quede con menos proteccion que el resto de la grilla.
    """
    if not velocidades_mm_min:
        return 0.0
    return sobrerecorrido_mm(max(velocidades_mm_min), machine)


def tamano_etiqueta_mm(espaciado_mm: float) -> tuple[float, float]:
    """Devuelve `(margen_mm, alto_mm)` de la etiqueta de ID de celda.

    Con espaciado amplio (>= `MARGEN_ETIQUETA_MM + ALTO_ETIQUETA_MM`, el caso
    de la mayoria de las suites) devuelve los valores por defecto sin tocarlos.
    Con espaciado chico -- ej. una cuadricula de shades de 7mm de celda con
    3mm de separacion -- los reduce para que quepan dentro de `espaciado_mm`:
    sin este ajuste, la etiqueta grabada arriba de una celda invadia el
    relleno de la celda de la fila siguiente (los valores por defecto suman
    5mm, mas que el espaciado disponible).

    Levanta `ValueError` si ni siquiera el piso legible entra en el espaciado.
    """
    total_defecto = MARGEN_ETIQUETA_MM + ALTO_ETIQUETA_MM
    if espaciado_mm >= total_defecto:
        return MARGEN_ETIQUETA_MM, ALTO_ETIQUETA_MM

    disponible = espaciado_mm - _BUFFER_ETIQUETA_MM
    total_minimo = MARGEN_ETIQUETA_MIN_MM + ALTO_ETIQUETA_MIN_MM
    if disponible < total_minimo:
        raise ValueError(
            f"espaciado_mm={espaciado_mm} es insuficiente para grabar la etiqueta de ID "
            f"sin superponerse con la celda de la fila siguiente (minimo "
            f"{total_minimo + _BUFFER_ETIQUETA_MM}mm). Aumenta espaciado_mm o el "
            "tamano de celda."
        )

    margen = max(MARGEN_ETIQUETA_MIN_MM, disponible * (MARGEN_ETIQUETA_MM / total_defecto))
    alto = disponible - margen
    if alto < ALTO_ETIQUETA_MIN_MM:
        alto = ALTO_ETIQUETA_MIN_MM
        margen = disponible - alto
    return margen, alto


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
    """G-code de relleno tipo trama (zigzag horizontal) para grabar una celda cuadrada.

    Cada linea entra y sale del area visible con un sobre-recorrido (laser
    apagado, `S0`) a cada lado -- ver `SOBRERECORRIDO_MIN_MM`/`_MAX_MM` y
    `distancia_aceleracion_mm` -- para que el haz se encienda (`S{s}`) recien
    cuando la maquina ya esta acelerando hacia la celda visible, en vez de
    arrancar/frenar en seco justo en su borde.
    """
    if resolucion_linea_mm <= 0:
        raise ValueError("resolucion_linea_mm debe ser positiva")

    s = _valor_s(celda.potencia_pct, machine)
    x0, y0, lado = celda.x_mm, celda.y_mm, celda.tamano_mm

    overscan_mm = sobrerecorrido_mm(celda.velocidad_mm_min, machine)
    # Nunca coordenadas X negativas: si la grilla no se desplazo lo suficiente
    # en X (ver `margen_seguridad_columna_cero_mm` / `construir_grilla(...,
    # origen_x_mm=...)`), esta celda queda con menos sobre-recorrido de
    # "entrada" que el resto -- red de seguridad, no la forma normal de
    # evitarlo.
    x_min = max(x0 - overscan_mm, 0.0)
    x_max = x0 + lado + overscan_mm

    lineas = [f"G0 X{x_min:.3f} Y{y0:.3f} F{machine.travel_feed_mm_min}", "M4 S0"]
    y = y0
    ida = True
    while y <= y0 + lado + 1e-9:
        if ida:
            tramos = [(x0, 0), (x0 + lado, s), (x_max, 0)]
        else:
            tramos = [(x0 + lado, 0), (x0, s), (x_min, 0)]
        for x_destino, potencia_s in tramos:
            lineas.append(f"G1 X{x_destino:.3f} Y{y:.3f} F{celda.velocidad_mm_min} S{potencia_s}")
        y += resolucion_linea_mm
        if y <= y0 + lado + 1e-9:
            x_actual = x_max if ida else x_min
            lineas.append(f"G0 X{x_actual:.3f} Y{y:.3f} F{machine.travel_feed_mm_min}")
        ida = not ida
    lineas.append("M5")
    return lineas


def dimensiones_totales_mm(config: SuiteConfig) -> tuple[float, float]:
    """Ancho x alto reales (mm) que va a ocupar la grilla completa de la suite
    sobre el material, incluyendo el margen de la etiqueta de ID grabada arriba
    de la fila superior -- para poder avisar de antemano si una suite no cabe
    en una pieza de area restringida (ej. una carcasa de telefono) antes de
    generarla, no despues de gastar material.
    """
    paso = config.tamano_celda_mm + config.espaciado_mm
    n_columnas = len(config.velocidades_mm_min)
    n_filas = len(config.potencias_pct)
    margen_etiqueta_mm, alto_etiqueta_mm = tamano_etiqueta_mm(config.espaciado_mm)
    ancho_mm = (n_columnas - 1) * paso + config.tamano_celda_mm
    alto_mm = (n_filas - 1) * paso + config.tamano_celda_mm + margen_etiqueta_mm + alto_etiqueta_mm
    return ancho_mm, alto_mm


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
