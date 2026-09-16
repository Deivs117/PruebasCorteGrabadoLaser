"""Emision de G-code para el contorno y el relleno de un conjunto de subpaths
ya escalados a milimetros (ver `laser_toolkit.svg.transform`), reutilizando
las mismas convenciones de `laser_toolkit.gcode.writer` (M4 dinamico, valor S
segun `MachineConfig.laser_max_s`).
"""

from __future__ import annotations

import itertools
import math

from laser_toolkit.config import MachineConfig
from laser_toolkit.gcode.writer import sobrerecorrido_mm
from laser_toolkit.svg.fill import Segmento
from laser_toolkit.svg.geometry import Punto, Subpath


def _valor_s(potencia_pct: int, machine: MachineConfig) -> int:
    return round((potencia_pct / 100) * machine.laser_max_s)


def _punto_de_entrada(sp: Subpath) -> Punto:
    return sp.puntos[0]


def _punto_de_salida(sp: Subpath) -> Punto:
    # Un subpath cerrado vuelve a su propio punto de entrada (ver el `append`
    # de cierre en `gcode_contorno`) -- el punto de salida real es el mismo
    # que el de entrada. Uno abierto termina donde termina su ultimo punto.
    return sp.puntos[0] if sp.cerrado else sp.puntos[-1]


def _distancia(a: Punto, b: Punto) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def ordenar_subpaths_por_proximidad(
    subpaths: list[Subpath], punto_inicial: Punto = (0.0, 0.0)
) -> list[Subpath]:
    """Reordena `subpaths` con un vecino-mas-cercano voraz (mismo criterio
    que "Reduce travel moves" de LightBurn): en vez de cortar/grabar el
    contorno en el orden en que aparecen en el archivo SVG (arbitrario, el
    orden en que alguien dibujo cada forma en Illustrator/Inkscape), arranca
    del subpath cuyo punto de entrada esta mas cerca de `punto_inicial`, y
    de ahi en mas siempre salta al que este mas cerca de donde termino el
    anterior -- para un diseño con varias piezas de corte separadas (varias
    letras sueltas, por ejemplo), esto reduce el recorrido total en vacio
    (`G0`) entre una pieza y la siguiente.

    Bajo impacto para un solo subpath (un circulo, un cuadrado) -- la
    ganancia real aparece con muchos subpaths independientes. Algoritmo
    O(n^2), aceptable para la cantidad de piezas de corte tipica de un
    diseño real (decenas, no miles) -- no es el optimo exacto del problema
    del viajante, es la misma heuristica voraz que ya usan LightBurn y
    similares para esto.

    `punto_inicial` simplifica asumiendo que el cabezal arranca en (0,0) --
    no conoce la posicion real de la maquina al momento de emitir este
    bloque (podria venir de otro objeto del lienzo antes), asi que es una
    aproximacion razonable, no la optima exacta."""
    restantes = list(subpaths)
    ordenados: list[Subpath] = []
    actual = punto_inicial
    while restantes:
        indice_mas_cercano = min(
            range(len(restantes)), key=lambda i: _distancia(actual, _punto_de_entrada(restantes[i]))
        )
        elegido = restantes.pop(indice_mas_cercano)
        ordenados.append(elegido)
        actual = _punto_de_salida(elegido)
    return ordenados


def gcode_contorno(
    subpaths: list[Subpath],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    machine: MachineConfig,
    pasadas: int = 1,
) -> list[str]:
    """G-code que traza el contorno de cada subpath (cerrando solo los que
    `Subpath.cerrado` marca como tales), repitiendo cada uno `pasadas` veces
    (issue: el corte del editor no soportaba varias pasadas, a diferencia del
    corte de Suites/`cortar_cuadrado` -- MDF de 3mm real necesita 2 pasadas a
    100% de potencia para cortar de punta a punta, una sola no alcanza).
    Cada subpath se recorre por completo `pasadas` veces antes de pasar al
    siguiente, para no ir y volver de un lado al otro del dibujo entre
    pasadas.

    Los subpaths se recorren en el orden que da `ordenar_subpaths_por_proximidad`
    (vecino mas cercano), no en el orden en que vienen del SVG -- reduce el
    recorrido en vacio entre piezas de corte separadas (issue: "reordenar
    por proximidad", ver LightBurn "Reduce travel moves")."""
    if pasadas < 1:
        raise ValueError("pasadas debe ser al menos 1")

    s = _valor_s(potencia_pct, machine)
    lineas: list[str] = []
    # Filtra los degenerados ANTES de ordenar -- `ordenar_subpaths_por_proximidad`
    # asume `sp.puntos[0]` valido, y un subpath de 0-1 puntos de todos modos
    # se salteaba sin emitir nada (ver el chequeo que sigue).
    subpaths_validos = [sp for sp in subpaths if len(sp.puntos) >= 2]

    for sp in ordenar_subpaths_por_proximidad(subpaths_validos):
        puntos = list(sp.puntos)
        if sp.cerrado:
            puntos.append(puntos[0])

        x0, y0 = puntos[0]
        for pasada in range(pasadas):
            lineas.append(f"G0 X{x0 + x_offset_mm:.3f} Y{y0 + y_offset_mm:.3f} F{machine.travel_feed_mm_min}")
            lineas.append(f"M4 S{s}")
            for x, y in puntos[1:]:
                lineas.append(f"G1 X{x + x_offset_mm:.3f} Y{y + y_offset_mm:.3f} F{velocidad_mm_min}")
            lineas.append("M5")
            if pasada < pasadas - 1:
                lineas.append(
                    f"; pasada {pasada + 2}/{pasadas}: aplicar z_step_mm de la configuracion "
                    "(ajuste manual de Z o G-code M-code segun el firmware)"
                )

    return lineas


def gcode_relleno(
    segmentos: list[Segmento],
    x_offset_mm: float,
    y_offset_mm: float,
    velocidad_mm_min: int,
    potencia_pct: int,
    machine: MachineConfig,
) -> list[str]:
    """G-code de relleno con UN solo `M4`/`M5` por FILA de barrido, no uno
    por cada segmento de tinta de esa fila -- mismo mecanismo de "tono
    continuo" que ya usa `laser_toolkit.raster.gcode.gcode_grabado_raster`
    para fotos (un `G1` continuo por fila, modulando `S` a lo largo del
    camino: `S0` en los huecos entre islas de tinta, `S{potencia}` dentro de
    cada una), nunca portado hasta ahora al relleno vectorial.

    Por que importa: antes, cada isla de tinta de una fila (cada letra,
    cada pata de un dibujo) armaba/desarmaba el laser por separado
    (`M4`...`G1`...`M5`), y cada `M4`/`M5` obliga a GRBL a frenar a cero y
    volver a acelerar -- medido en una pieza real con muchos trazos finos,
    esas paradas dominaban el tiempo total (ver el hallazgo de #195/overscan
    del mismo dia). Con un solo arranque/parada por fila entera (no por
    isla), esas paradas se reducen en el mismo orden que la cantidad
    promedio de islas por fila.

    El sobre-recorrido (`sobrerecorrido_mm`) ahora se aplica UNA vez al
    principio de la fila y UNA vez al final (no por cada isla) -- exactamente
    igual que `gcode_grabado_raster`, porque ya no hace falta "re-acelerar"
    entre islas de la misma fila: la maquina nunca se detiene ahi, solo baja
    `S` a 0 mientras sigue en movimiento. Topado al largo real de TODA la
    fila (de la primera a la ultima isla), no al de cada isla individual --
    con el arranque/parada unificado, ya no hay un perfil triangular por
    isla que proteger."""
    s = _valor_s(potencia_pct, machine)
    overscan_maximo_mm = sobrerecorrido_mm(velocidad_mm_min, machine)
    lineas: list[str] = []

    for fila in _agrupar_por_fila(segmentos):
        primer_x, y = fila[0][0]
        ultimo_x, _ = fila[-1][1]
        direccion = 1.0 if ultimo_x >= primer_x else -1.0
        overscan_mm = min(overscan_maximo_mm, abs(ultimo_x - primer_x))
        y_abs = y + y_offset_mm

        def abs_x(x_local: float) -> float:
            return x_local + x_offset_mm

        entrada = primer_x - direccion * overscan_mm
        salida = ultimo_x + direccion * overscan_mm

        lineas.append(f"G0 X{abs_x(entrada):.3f} Y{y_abs:.3f} F{machine.travel_feed_mm_min}")
        lineas.append("M4 S0")
        cursor_x = entrada
        for (x1, _y1), (x2, _y2) in fila:
            if x1 != cursor_x:
                lineas.append(f"G1 X{abs_x(x1):.3f} Y{y_abs:.3f} F{velocidad_mm_min} S0")
            lineas.append(f"G1 X{abs_x(x2):.3f} Y{y_abs:.3f} F{velocidad_mm_min} S{s}")
            cursor_x = x2
        if salida != cursor_x:
            lineas.append(f"G1 X{abs_x(salida):.3f} Y{y_abs:.3f} F{velocidad_mm_min} S0")
        lineas.append("M5")

    return lineas


def _agrupar_por_fila(segmentos: list[Segmento]) -> list[list[Segmento]]:
    """Agrupa `segmentos` (ya en el orden real de recorrido de
    `generar_segmentos_relleno`, zigzag incluido) por fila -- todos los
    segmentos de una misma fila comparten la misma Y exacta (mismo `y` que
    pasa el barrido de `generar_segmentos_relleno`), y ya vienen contiguos
    en la lista (una fila completa antes de pasar a la siguiente)."""
    return [
        list(grupo)
        for _y, grupo in itertools.groupby(segmentos, key=lambda seg: seg[0][1])
    ]


def longitud_contorno_mm(subpaths: list[Subpath]) -> float:
    """Suma de las longitudes de todos los subpaths (cerrando los que corresponda)."""
    total = 0.0
    for sp in subpaths:
        if len(sp.puntos) < 2:
            continue
        puntos = list(sp.puntos)
        if sp.cerrado:
            puntos.append(puntos[0])
        # strict=False: por construccion `puntos[1:]` tiene un elemento menos
        # que `puntos` -- es exactamente el zip de "pares consecutivos".
        for (x1, y1), (x2, y2) in zip(puntos, puntos[1:], strict=False):
            total += math.hypot(x2 - x1, y2 - y1)
    return total


def longitud_relleno_mm(segmentos: list[Segmento]) -> float:
    return sum(math.hypot(x2 - x1, y2 - y1) for (x1, y1), (x2, y2) in segmentos)
