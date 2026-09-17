"""Estimacion de duracion total de una corrida a partir del G-code YA
GENERADO (a diferencia de `laser_toolkit.gcode.timing`, que estima por celda
ANTES de generar, con un modelo de primer orden sin aceleracion).

Este modelo parsea las lineas de G-code linea por linea, reconstruyendo el
perfil trapezoidal/triangular de velocidad real de GRBL (arranca y frena a
cero en cada M3/M4/M5/G0, porque GRBL siempre frena a cero para ejecutar un
M-code) y aplica un margen extra cuando detecta curvas de radio chico -- las
esquinas obligan a frenar mas de lo que el perfil trapezoidal por si solo
predice.

Calibrado con 2 corridas fisicas reales (ver `handoff.md` de la sesion que lo
derivo): circulo simple 30mm (segmentos ~2.3mm, sin margen de curva) -> 38.1min
estimado vs 40min real (~5% error); rectangulo con esquinas de 4mm (segmentos
~0.5mm, con margen de curva) -> 18.4min estimado vs 18min real (~2.2% error).
Mas corridas reales deberian ajustar las 3 constantes de abajo.
"""

from __future__ import annotations

import math

from laser_toolkit.config import MachineConfig

ANGULO_MINIMO_CURVA_DEG = 3.0
SEGMENTO_CORTO_MAX_MM = 3.0
MARGEN_CURVA_PCT = 15.0

_EJES_VALIDOS = ("X", "Y", "F")


def tiempo_fase_s(longitud_mm: float, feed_mm_min: float, aceleracion_mm_s2: float) -> float:
    """Tiempo (s) de recorrer `longitud_mm` en linea recta arrancando y
    terminando en velocidad cero (perfil trapezoidal si la fase es larga
    para llegar a `feed_mm_min` de crucero, o triangular si nunca llega --
    caso tipico de segmentos cortos de relleno/curvas).

    Una "fase" es un tramo continuo de `G1` entre dos M-codes/`G0` -- GRBL
    frena a cero para ejecutar cualquier M-code, asi que ese es el limite
    real de cada arranque/frenado, no cada linea de G-code individual."""
    if longitud_mm <= 0 or feed_mm_min <= 0:
        return 0.0
    v_mm_s = feed_mm_min / 60.0
    distancia_aceleracion_mm = v_mm_s**2 / (2 * aceleracion_mm_s2)
    if longitud_mm >= 2 * distancia_aceleracion_mm:
        return 2 * (v_mm_s / aceleracion_mm_s2) + (longitud_mm - 2 * distancia_aceleracion_mm) / v_mm_s
    v_pico_mm_s = (aceleracion_mm_s2 * longitud_mm) ** 0.5
    return 2 * v_pico_mm_s / aceleracion_mm_s2


def _valores_de_linea(codigo: str) -> dict[str, float]:
    valores: dict[str, float] = {}
    for token in codigo.split()[1:]:
        eje = token[0].upper()
        if eje in _EJES_VALIDOS and len(token) > 1:
            try:
                valores[eje] = float(token[1:])
            except ValueError:
                continue
    return valores


def estimar_duracion_s(lineas: list[str], machine: MachineConfig) -> float:
    """Duracion estimada (segundos) de ejecutar `lineas` de G-code en `machine`.

    Modela movimiento en el plano XY tanto de `G1` (corte/grabado) COMO de
    `G0` (desplazamiento en vacio entre celdas/filas, laser apagado) -- un
    `G0` SI arranca y frena a cero como cualquier otro movimiento (GRBL no
    lo funde con el `G1`/M-code siguiente), asi que un G-code con muchos
    saltos entre celdas puede tener una fraccion no despreciable de su
    tiempo total en puros desplazamientos. Los `G91`/`G0 Z...` de cambio de
    foco (`elevar_z_para_grabado`/`bajar_z_para_corte`) no llevan X/Y y no
    aportan distancia, asi que quedan implicitamente en cero sin necesitar
    un caso especial."""
    aceleracion = machine.aceleracion_mm_s2
    x, y, feed = 0.0, 0.0, 0.0
    fase_longitud_mm = 0.0
    fase_feed_mm_min = 0.0
    fase_segmentos: list[tuple[float, float, float]] = []  # (dx, dy, longitud) de cada G1 de la fase
    tiempo_total_s = 0.0
    tiene_curvas = False

    def cerrar_fase() -> None:
        nonlocal fase_longitud_mm, fase_feed_mm_min, fase_segmentos, tiempo_total_s, tiene_curvas
        if fase_longitud_mm > 0:
            tiempo_total_s += tiempo_fase_s(fase_longitud_mm, fase_feed_mm_min, aceleracion)
            for (dx1, dy1, l1), (dx2, dy2, l2) in zip(fase_segmentos, fase_segmentos[1:], strict=False):
                cos_angulo = max(-1.0, min(1.0, (dx1 * dx2 + dy1 * dy2) / (l1 * l2)))
                angulo_deg = math.degrees(math.acos(cos_angulo))
                if angulo_deg > ANGULO_MINIMO_CURVA_DEG and (
                    l1 < SEGMENTO_CORTO_MAX_MM or l2 < SEGMENTO_CORTO_MAX_MM
                ):
                    tiene_curvas = True
        fase_longitud_mm = 0.0
        fase_feed_mm_min = 0.0
        fase_segmentos = []

    for linea in lineas:
        codigo = linea.split(";", 1)[0].strip()
        if not codigo:
            continue
        comando = codigo.split()[0].upper()
        valores = _valores_de_linea(codigo)
        nuevo_x = valores.get("X", x)
        nuevo_y = valores.get("Y", y)
        nuevo_feed = valores.get("F", feed)

        if comando == "G0":
            # Cierra cualquier fase de G1 pendiente -- un G0 no continua la
            # velocidad de un G1 anterior -- y se cuenta como su PROPIO
            # arranque/frenado (no se acumula con otros G0, ver docstring).
            cerrar_fase()
            distancia_mm = math.hypot(nuevo_x - x, nuevo_y - y)
            if distancia_mm > 0:
                tiempo_total_s += tiempo_fase_s(distancia_mm, nuevo_feed, aceleracion)
            x, y, feed = nuevo_x, nuevo_y, nuevo_feed
            continue

        if comando == "G1":
            if fase_longitud_mm > 0 and nuevo_feed != feed:
                cerrar_fase()  # cambio de feed a mitad de fase, sin M-code de por medio
            dx, dy = nuevo_x - x, nuevo_y - y
            longitud_mm = math.hypot(dx, dy)
            fase_longitud_mm += longitud_mm
            fase_feed_mm_min = nuevo_feed
            if longitud_mm > 0:
                fase_segmentos.append((dx, dy, longitud_mm))
            x, y, feed = nuevo_x, nuevo_y, nuevo_feed
            continue

        # M3/M4/M5 (encendido/apagado laser) y cualquier otro codigo
        # (G90/G91/G21...) cierran la fase acumulada: GRBL frena a cero para
        # ejecutar un M-code, asi que no hay continuidad de velocidad con lo
        # que venga despues.
        cerrar_fase()
        x, y, feed = nuevo_x, nuevo_y, nuevo_feed

    cerrar_fase()

    if tiene_curvas:
        tiempo_total_s *= 1 + MARGEN_CURVA_PCT / 100

    return tiempo_total_s
