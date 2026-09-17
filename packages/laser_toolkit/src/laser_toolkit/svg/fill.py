"""Relleno vectorial tipo trama de un conjunto de subpaths, por barrido de
lineas horizontales (scanline) con la regla par-impar (even-odd), igual que
el motor de renderizado por defecto de SVG.

Al calcularse sobre TODOS los subpaths juntos, esto maneja correctamente
formas independientes (varias figuras separadas, cada una se rellena por su
cuenta) y formas con huecos (un subpath interior resta en vez de sumar,
igual que un agujero de letra 'O' o 'A').
"""

from __future__ import annotations

import math
from collections import deque

from laser_toolkit.svg.geometry import Punto, Subpath

Segmento = tuple[Punto, Punto]


def _bordes(subpaths: list[Subpath]) -> list[tuple[Punto, Punto]]:
    """Aristas de todos los subpaths, cerrando cada uno implicitamente
    (el relleno no distingue abierto/cerrado -- ver `Subpath.cerrado`)."""
    aristas: list[tuple[Punto, Punto]] = []
    for sp in subpaths:
        n = len(sp.puntos)
        if n < 2:
            continue
        for i in range(n):
            aristas.append((sp.puntos[i], sp.puntos[(i + 1) % n]))
    return aristas


def _cruces_en_y(aristas: list[tuple[Punto, Punto]], y: float) -> list[float]:
    """Coordenadas X donde la linea horizontal `y` cruza las aristas."""
    cruces: list[float] = []
    for (x1, y1), (x2, y2) in aristas:
        if y1 == y2:
            continue  # arista horizontal: no aporta un cruce puntual
        # Semi-abierto [y1, y2) para no contar dos veces un vertice compartido.
        y_min, y_max = (y1, y2) if y1 < y2 else (y2, y1)
        if not (y_min <= y < y_max):
            continue
        t = (y - y1) / (y2 - y1)
        cruces.append(x1 + t * (x2 - x1))
    return sorted(cruces)


def generar_segmentos_relleno(subpaths: list[Subpath], resolucion_mm: float) -> list[Segmento]:
    """Lineas de relleno horizontales, espaciadas `resolucion_mm`, recortadas
    a las zonas "dentro" segun la regla par-impar.

    Filas alternadas en zigzag (boustrophedon), igual que
    `laser_toolkit.gcode.writer.grabar_relleno`/`laser_toolkit.raster.gcode.
    gcode_grabado_raster`: una fila de "ida" (izquierda a derecha) devuelve
    sus segmentos en orden creciente de X, cada uno de menor a mayor X; la
    fila de "vuelta" los devuelve en orden DECRECIENTE de X, cada uno de
    mayor a menor X -- para que el ultimo punto de una fila quede cerca del
    primer punto de la siguiente, en vez de que la maquina viaje en vacio
    de vuelta al extremo izquierdo cada vez que termina una fila a la
    derecha. `gcode_relleno` ya no asume `x1 <= x2` en cada segmento, sigue
    el sentido real que trae cada uno."""
    if resolucion_mm <= 0:
        raise ValueError("resolucion_mm debe ser positiva")

    aristas = _bordes(subpaths)
    todos_los_puntos = [p for sp in subpaths for p in sp.puntos]
    if not todos_los_puntos:
        return []

    y_min = min(p[1] for p in todos_los_puntos)
    y_max = max(p[1] for p in todos_los_puntos)

    segmentos: list[Segmento] = []
    y = y_min + resolucion_mm / 2  # centrado en cada franja, evita rozar vertices
    ida = True
    while y < y_max:
        cruces = _cruces_en_y(aristas, y)
        # Los cruces vienen en pares consecutivos: [dentro, fuera, dentro, fuera, ...]
        pares = [(cruces[i], cruces[i + 1]) for i in range(0, len(cruces) - 1, 2)]
        if ida:
            segmentos += [((x1, y), (x2, y)) for x1, x2 in pares]
        else:
            segmentos += [((x2, y), (x1, y)) for x1, x2 in reversed(pares)]
        y += resolucion_mm
        ida = not ida

    return segmentos


def agrupar_subpaths_por_tinta_real(subpaths: list[Subpath], resolucion_mm: float) -> list[list[Subpath]]:
    """Agrupa `subpaths` por conectividad de la TINTA REAL ya rellenada
    (rasteriza el relleno real con `generar_segmentos_relleno` y busca
    componentes conexas sobre esa grilla, conectividad-8 -- misma tecnica
    que usa vision por computadora para "separar objetos en una imagen",
    equivalente a `cv2.connectedComponents`/`scipy.ndimage.label`,
    implementado a mano para no agregar una dependencia nueva).

    Util como utilidad de segmentacion general (ej. extraer una figura
    suelta de un logo con texto, sin arrastrar el resto): dos letras
    consecutivas tienen cajas envolventes que se tocan/superponen en Y
    (comparten el renglon) aunque la tinta real tenga un hueco blanco
    real entre ellas -- solo la tinta rasterizada distingue eso.

    Un subpath se asigna al componente que contiene la MAYORIA de sus
    propios puntos (voto simple) -- robusto ante el caso limite de un
    punto que caiga justo en el borde de una celda de la grilla.

    Indexado de grilla con `floor`, nunca `round`: los centros de fila que
    arma `generar_segmentos_relleno` caen siempre en un `.5` exacto de
    `resolucion_mm` (`y_min + resolucion/2`, `+resolucion`, ...) -- `round()`
    usa redondeo bancario en ese caso exacto (`round(0.5)==0`,
    `round(1.5)==2`, `round(2.5)==2`, ...), que salta y duplica indices de
    fila y fragmenta una forma conexa en varios pedazos falsos (verificado:
    un aro simple de una sola pieza se partia en 16). `floor` mapea cada
    fila real a un indice entero consecutivo, sin saltos."""
    segmentos = generar_segmentos_relleno(subpaths, resolucion_mm)
    if not segmentos:
        return [[sp] for sp in subpaths]

    def a_celda(x: float, y: float) -> tuple[int, int]:
        return (math.floor(y / resolucion_mm), math.floor(x / resolucion_mm))

    grilla: set[tuple[int, int]] = set()
    for (x1, y), (x2, _y2) in segmentos:
        fila, c0 = a_celda(x1, y)
        _fila2, c1 = a_celda(x2, y)
        c0, c1 = sorted((c0, c1))
        grilla.update((fila, col) for col in range(c0, c1 + 1))

    id_componente: dict[tuple[int, int], int] = {}
    vecinos8 = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))
    siguiente_id = 0
    for celda in grilla:
        if celda in id_componente:
            continue
        cola = deque([celda])
        id_componente[celda] = siguiente_id
        while cola:
            actual = cola.popleft()
            for dr, dc in vecinos8:
                vecino = (actual[0] + dr, actual[1] + dc)
                if vecino in grilla and vecino not in id_componente:
                    id_componente[vecino] = siguiente_id
                    cola.append(vecino)
        siguiente_id += 1

    def celda_mas_cercana(x: float, y: float) -> tuple[int, int] | None:
        fila, col = a_celda(x, y)
        if (fila, col) in id_componente:
            return (fila, col)
        for dr, dc in vecinos8:  # el punto puede caer justo en el borde de la celda
            vecino = (fila + dr, col + dc)
            if vecino in id_componente:
                return vecino
        return None

    grupos: dict[int, list[Subpath]] = {}
    sin_asignar: list[Subpath] = []
    for sp in subpaths:
        votos: dict[int, int] = {}
        for x, y in sp.puntos:
            celda = celda_mas_cercana(x, y)
            if celda is not None:
                votos[id_componente[celda]] = votos.get(id_componente[celda], 0) + 1
        if not votos:
            sin_asignar.append(sp)  # subpath degenerado sin puntos cerca de tinta real
            continue
        ganador = max(votos, key=lambda k: votos[k])
        grupos.setdefault(ganador, []).append(sp)

    resultado = list(grupos.values())
    if sin_asignar:
        resultado.append(sin_asignar)
    return resultado
