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

from PIL import Image, ImageFilter

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


def extraer_contorno_con_margen(
    imagen: Image.Image, ancho_mm: float, alto_mm: float, margen_mm: float
) -> tuple[list[Subpath], float, float]:
    """Igual que `extraer_contorno`, pero expande el resultado `margen_mm`
    hacia afuera en cada direccion (issue #108: el vector de corte generado
    automaticamente necesita separacion respecto del borde real del diseño
    -- cortar justo sobre el borde deja cualquier imprecision de la maquina
    recortando el diseño mismo).

    Devuelve tambien el nuevo ancho/alto en mm que ocupa el contorno (crece
    `2*margen_mm` respecto de `ancho_mm`/`alto_mm`, centrado) -- quien llama
    necesita ese tamaño para ubicar el objeto resultante en el lienzo, no
    solo su geometria.

    Sin canal alfa real (o `margen_mm == 0`), el margen simplemente agranda
    el rectangulo (mismo fallback que `_contorno_rectangulo`). Con canal
    alfa, dilata la mascara binaria con un filtro maximo (aproximacion
    Chebyshev/cuadrada, no euclidea circular -- mismo tipo de aproximacion
    ya aceptado en `_trazar_bordes_mascara`) y vuelve a trazar el borde sobre
    la mascara ya crecida, reusando `_extraer_contorno_alfa` tal cual."""
    if margen_mm < 0:
        raise ValueError(f"El margen del contorno no puede ser negativo (recibido: {margen_mm}).")

    ancho_total_mm = ancho_mm + 2 * margen_mm
    alto_total_mm = alto_mm + 2 * margen_mm

    if margen_mm == 0:
        return extraer_contorno(imagen, ancho_mm, alto_mm), ancho_mm, alto_mm

    if "A" in imagen.getbands():
        alfa = imagen.getchannel("A")
        minimo, _maximo = cast("tuple[int, int]", alfa.getextrema())
        if minimo < 255:
            alfa_dilatada = _dilatar_mascara_alfa(alfa, ancho_mm, alto_mm, margen_mm)
            contorno = _extraer_contorno_alfa(alfa_dilatada, ancho_total_mm, alto_total_mm)
            return contorno, ancho_total_mm, alto_total_mm

    return [_contorno_rectangulo(ancho_total_mm, alto_total_mm)], ancho_total_mm, alto_total_mm


def _dilatar_mascara_alfa(
    alfa: Image.Image, ancho_mm: float, alto_mm: float, margen_mm: float
) -> Image.Image:
    """Agranda el lienzo de `alfa` por `margen_mm` de relleno transparente en
    cada lado y aplica un filtro maximo (dilatacion morfologica) del radio
    equivalente en pixeles -- crece la silueta hacia afuera sin depender de
    ninguna libreria de geometria vectorial (no hay una en el proyecto,
    decision de #3 para `raster.contorno`).

    El radio en pixeles usa el promedio de escala X/Y (`ancho_px/ancho_mm` y
    `alto_px/alto_mm`) -- exacto cuando la imagen no viene distorsionada
    (aspecto preservado, el caso normal con `mantenerProporcion`), aproximado
    en el caso raro contrario."""
    ancho_px, alto_px = alfa.size
    escala_x = ancho_px / ancho_mm
    escala_y = alto_px / alto_mm
    radio_px = max(1, round(margen_mm * (escala_x + escala_y) / 2))

    lienzo = Image.new("L", (ancho_px + 2 * radio_px, alto_px + 2 * radio_px), 0)
    lienzo.paste(alfa, (radio_px, radio_px))
    return lienzo.filter(ImageFilter.MaxFilter(2 * radio_px + 1))


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
