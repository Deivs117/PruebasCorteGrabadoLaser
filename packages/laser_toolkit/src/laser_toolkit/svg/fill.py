"""Relleno vectorial tipo trama de un conjunto de subpaths, por barrido de
lineas horizontales (scanline) con la regla par-impar (even-odd), igual que
el motor de renderizado por defecto de SVG.

Al calcularse sobre TODOS los subpaths juntos, esto maneja correctamente
formas independientes (varias figuras separadas, cada una se rellena por su
cuenta) y formas con huecos (un subpath interior resta en vez de sumar,
igual que un agujero de letra 'O' o 'A').
"""

from __future__ import annotations

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
    a las zonas "dentro" segun la regla par-impar."""
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
    while y < y_max:
        cruces = _cruces_en_y(aristas, y)
        # Los cruces vienen en pares consecutivos: [dentro, fuera, dentro, fuera, ...]
        for i in range(0, len(cruces) - 1, 2):
            segmentos.append(((cruces[i], y), (cruces[i + 1], y)))
        y += resolucion_mm

    return segmentos
