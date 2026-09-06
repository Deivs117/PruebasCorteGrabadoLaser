"""Extraccion de contorno de corte a partir de una imagen (issue #15,
ampliacion de alcance del 2026-09-06): cuando un objeto raster combina
corte+grabado, el contorno de corte sale de la propia imagen, sin pedirle
al usuario que dibuje uno aparte.

- PNG con canal alfa real (no completamente opaco): el contorno sigue la
  silueta de la mascara alfa -- transparente = fuera de la pieza.
- Cualquier otro caso (JPEG, o PNG sin transparencia real): el contorno es
  el rectangulo que contiene la imagen entera.

v1 no vectoriza formas arbitrarias mas alla de estos dos casos (decision
tomada en #3) -- no hay OpenCV en el proyecto; la mascara alfa se traza con
un algoritmo propio liviano de "boundary tracing" sobre la grilla de pixeles
(cada pixel es una celda cuadrada, el contorno sigue sus bordes -- por
construccion queda "escalonado" en diagonales, no suavizado; aceptable para
v1, ver docstring de `_trazar_bordes_mascara`).
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from typing import cast

from PIL import Image

from laser_toolkit.svg.geometry import Punto, Subpath

# Bajo este valor de alfa (0-255) un pixel se considera "fuera" de la pieza.
UMBRAL_ALFA = 128


def extraer_contorno(imagen: Image.Image, ancho_mm: float, alto_mm: float) -> list[Subpath]:
    """Punto de entrada unico: decide silueta alfa vs. rectangulo segun si
    `imagen` tiene transparencia real, y devuelve el contorno ya escalado a
    milimetros (misma convencion de Y invertido que `laser_toolkit.svg`)."""
    if "A" in imagen.getbands():
        alfa = imagen.getchannel("A")
        # "L" (canal alfa aislado) siempre da extremos enteros -- los stubs
        # de Pillow tipan `getextrema()` como union generica por los modos
        # multi-banda, que acá no aplican.
        minimo, _maximo = cast("tuple[int, int]", alfa.getextrema())
        if minimo < 255:
            return _extraer_contorno_alfa(alfa, ancho_mm, alto_mm)
    return [_contorno_rectangulo(ancho_mm, alto_mm)]


def _contorno_rectangulo(ancho_mm: float, alto_mm: float) -> Subpath:
    return Subpath(
        puntos=((0.0, 0.0), (ancho_mm, 0.0), (ancho_mm, alto_mm), (0.0, alto_mm)),
        cerrado=True,
    )


def _extraer_contorno_alfa(alfa: Image.Image, ancho_mm: float, alto_mm: float) -> list[Subpath]:
    ancho_px, alto_px = alfa.size
    mascara = _mascara_binaria(alfa)
    aristas_px = _trazar_bordes_mascara(mascara)
    bucles_px = _encadenar_en_bucles(aristas_px)

    escala_x = ancho_mm / ancho_px
    escala_y = alto_mm / alto_px
    subpaths = []
    for bucle in bucles_px:
        if len(bucle) < 3:
            continue  # bucle degenerado (ruido de 1-2 pixeles aislados)
        puntos = tuple(
            (x_px * escala_x, alto_mm - y_px * escala_y)  # Y invertido, misma convencion que svg.transform
            for x_px, y_px in bucle
        )
        subpaths.append(Subpath(puntos=puntos, cerrado=True))
    return subpaths or [_contorno_rectangulo(ancho_mm, alto_mm)]


def _mascara_binaria(alfa: Image.Image, umbral: int = UMBRAL_ALFA) -> list[list[bool]]:
    ancho, alto = alfa.size
    datos = cast("Sequence[int]", alfa.getdata())
    return [[datos[y * ancho + x] >= umbral for x in range(ancho)] for y in range(alto)]


def _trazar_bordes_mascara(mascara: list[list[bool]]) -> list[tuple[Punto, Punto]]:
    """Cada lado de un pixel "dentro" que colinda con un pixel "fuera" (o con
    el borde de la imagen) aporta una arista, en coordenadas de ESQUINA de
    pixel (no de centro) -- por eso el contorno resultante queda alineado a
    la grilla ("escalonado" en los bordes diagonales de la silueta original,
    en vez de suavizado)."""
    alto = len(mascara)
    ancho = len(mascara[0]) if alto else 0
    aristas: list[tuple[Punto, Punto]] = []

    for y in range(alto):
        for x in range(ancho):
            if not mascara[y][x]:
                continue
            if y == 0 or not mascara[y - 1][x]:
                aristas.append(((x, y), (x + 1, y)))  # borde superior
            if y == alto - 1 or not mascara[y + 1][x]:
                aristas.append(((x, y + 1), (x + 1, y + 1)))  # borde inferior
            if x == 0 or not mascara[y][x - 1]:
                aristas.append(((x, y), (x, y + 1)))  # borde izquierdo
            if x == ancho - 1 or not mascara[y][x + 1]:
                aristas.append(((x + 1, y), (x + 1, y + 1)))  # borde derecho

    return aristas


def _encadenar_en_bucles(aristas: list[tuple[Punto, Punto]]) -> list[list[Punto]]:
    """Encadena aristas de borde (cada una comparte extremos con las
    vecinas) en polilineas cerradas, caminando la adyacencia.

    Limitacion conocida (v1): dos pixeles "dentro" que solo se tocan por una
    esquina (patron de tablero de ajedrez) generan un vertice de grado 4 en
    vez de 2 -- el recorrido igual cierra un bucle valido en ese vertice,
    pero puede unir dos siluetas que deberian quedar separadas. Caso raro en
    fotos/logos reales; no vale la pena resolverlo en v1."""
    adyacencia: dict[Punto, list[Punto]] = defaultdict(list)
    for a, b in aristas:
        adyacencia[a].append(b)
        adyacencia[b].append(a)

    visitadas: set[tuple[Punto, Punto]] = set()
    bucles: list[list[Punto]] = []

    for inicio in list(adyacencia):
        for primer_vecino in list(adyacencia[inicio]):
            if (inicio, primer_vecino) in visitadas:
                continue
            bucle = [inicio]
            actual = primer_vecino
            visitadas.add((inicio, actual))
            visitadas.add((actual, inicio))
            while actual != inicio:
                bucle.append(actual)
                # La arista de vuelta a de donde se vino ya quedo marcada
                # visitada arriba -- alcanza con pedir "la primera arista sin
                # visitar todavia" para no retroceder por donde se vino.
                siguiente = next(v for v in adyacencia[actual] if (actual, v) not in visitadas)
                visitadas.add((actual, siguiente))
                visitadas.add((siguiente, actual))
                actual = siguiente
            bucles.append(bucle)

    return bucles
