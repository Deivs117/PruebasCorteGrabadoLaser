"""Centroide ponderado por intensidad de "tinta" de una imagen (issue #196):
necesario para centrar un marco de corte simple (circulo/cuadrado, ver
`raster.contorno.generar_marco`) sobre el centro de masa REAL del diseño, no
el centro geometrico de su caja contenedora -- que no coincide si el diseño
es asimetrico (el pedido de cliente original: un logo grabado descentrado
dentro del rectangulo de la imagen).

Mismo criterio de `raster.contorno.extraer_contorno` para decidir la fuente
del peso de cada pixel:

- PNG con canal alfa real (no completamente opaco): el peso es el propio
  canal alfa -- transparente = sin tinta, sin necesitar ningun umbral (el
  alfa YA es la intencion explicita del autor del diseño).
- Cualquier otro caso (JPEG, o PNG sin transparencia real): el peso es la
  distancia de claridad (escala de grises) respecto al fondo detectado,
  apagada a cero por debajo de un umbral ajustable -- ver
  `UMBRAL_DISTANCIA_FONDO_POR_DEFECTO` para la justificacion del valor por
  defecto y `_color_de_fondo` para como se detecta el fondo.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from typing import cast

from PIL import Image

from laser_toolkit.raster.canal import calcular_matriz_intensidad
from laser_toolkit.raster.config import CanalRaster, ConfiguracionRaster
from laser_toolkit.raster.contorno import _limitar_resolucion
from laser_toolkit.svg.geometry import Punto

# Umbral por defecto de distancia de claridad respecto al fondo detectado
# (escala 0.0-1.0, misma normalizacion que devuelve `calcular_matriz_intensidad`)
# para imagenes SIN canal alfa util. Por debajo de este valor un pixel cuenta
# como "fondo" (ruido de compresion JPEG, antialiasing, textura leve del
# fondo real) en vez de tinta -- 0.15 es un punto medio razonable para el
# caso tipico de un logo de un solo color sobre un fondo limpio (claro u
# oscuro, no importa cual de los dos): ni tan chico que el ruido de una foto
# cuente como diseño, ni tan grande que un trazo fino de bajo contraste
# desaparezca del calculo. Expuesto como parametro (no una constante fija
# sin control, decision explicita del issue #196) porque un logo con
# semitonos o un fondo con textura real puede necesitar otro valor.
UMBRAL_DISTANCIA_FONDO_POR_DEFECTO = 0.15


def centroide_ponderado_imagen(
    imagen: Image.Image,
    ancho_mm: float,
    alto_mm: float,
    umbral_distancia_fondo: float = UMBRAL_DISTANCIA_FONDO_POR_DEFECTO,
) -> Punto:
    """Centro de masa real de `imagen`, en mm, en el mismo sistema de
    coordenadas que `raster.contorno` (Y creciente hacia arriba, origen
    abajo-izquierda -- misma convencion que `laser_toolkit.svg.transform`).

    Decide alfa vs. distancia de color con el mismo criterio que
    `raster.contorno.extraer_contorno` (transparencia real = algun pixel con
    alfa menor a 255)."""
    if "A" in imagen.getbands():
        alfa = imagen.getchannel("A")
        # Ver comentario analogo en `raster.contorno.extraer_contorno` sobre
        # por que `getextrema()` necesita este cast con un canal aislado.
        minimo, _maximo = cast("tuple[int, int]", alfa.getextrema())
        if minimo < 255:
            return _centroide_por_alfa(alfa, ancho_mm, alto_mm)
    return _centroide_por_distancia_fondo(imagen, ancho_mm, alto_mm, umbral_distancia_fondo)


def _acumular_centroide(pesos: Sequence[Sequence[float]], ancho_mm: float, alto_mm: float) -> Punto:
    """Centro de masa de una grilla `pesos[fila][columna]` (0.0 = sin tinta),
    con cada celda ubicada en su centro dentro de la caja `ancho_mm x
    alto_mm` (fila 0 = borde superior de la imagen, Y invertido al mm final
    -- misma convencion que `raster.contorno._extraer_contorno_alfa`)."""
    alto_grid = len(pesos)
    ancho_grid = len(pesos[0]) if alto_grid else 0
    if ancho_grid == 0 or alto_grid == 0:
        raise ValueError("Imagen vacia -- no se puede calcular un centroide.")

    escala_x = ancho_mm / ancho_grid
    escala_y = alto_mm / alto_grid
    peso_total = 0.0
    x_acumulado = 0.0
    y_acumulado = 0.0
    for fila_idx, fila in enumerate(pesos):
        for columna_idx, peso in enumerate(fila):
            if peso <= 0:
                continue
            x_mm = (columna_idx + 0.5) * escala_x
            y_mm = alto_mm - (fila_idx + 0.5) * escala_y
            peso_total += peso
            x_acumulado += peso * x_mm
            y_acumulado += peso * y_mm

    if peso_total <= 0:
        raise ValueError(
            "No se detecto tinta en la imagen (todo el peso quedo en cero) "
            "-- no se puede calcular un centroide. Probar con un umbral mas chico."
        )
    return (x_acumulado / peso_total, y_acumulado / peso_total)


def _centroide_por_alfa(alfa: Image.Image, ancho_mm: float, alto_mm: float) -> Punto:
    # Issue #183 (ver `raster.contorno`): un pixel de foto/celular a
    # resolucion nativa hace que el loop en Python puro de abajo tarde
    # minutos y mate la funcion serverless por timeout -- reusa el mismo
    # downscale que ya protege el trazado de contorno, misma justificacion
    # (perder detalle fino del alfa es aceptable, un centroide es un
    # promedio, no necesita precision de pixel).
    alfa = _limitar_resolucion(alfa)
    ancho_px, alto_px = alfa.size
    datos = cast("Sequence[int]", alfa.getdata())
    pesos = [[datos[y * ancho_px + x] / 255 for x in range(ancho_px)] for y in range(alto_px)]
    return _acumular_centroide(pesos, ancho_mm, alto_mm)


def _color_de_fondo(claridad: list[list[float]]) -> float:
    """Detecta el "fondo" como el valor de claridad mas frecuente en el
    borde de la grilla (fila superior/inferior, columna izquierda/derecha).
    El fondo, por definicion, es lo que rodea al diseño -- el diseño mismo
    rara vez toca las 4 orillas completas de la imagen, asi que el valor
    dominante del borde es una aproximacion razonable sin necesitar
    segmentacion real."""
    alto = len(claridad)
    ancho = len(claridad[0]) if alto else 0
    borde: list[float] = []
    for x in range(ancho):
        borde.append(claridad[0][x])
        borde.append(claridad[alto - 1][x])
    for y in range(alto):
        borde.append(claridad[y][0])
        borde.append(claridad[y][ancho - 1])

    # Cuantiza a 3 decimales: la grilla ya viene reducida a 0.0-1.0 por
    # `calcular_matriz_intensidad`, pero un fondo "liso" real rara vez cae en
    # el mismo float exacto en cada celda (ruido de compresion/muestreo) --
    # sin agrupar valores casi iguales, `Counter` casi nunca encuentra una
    # repeticion y el "mas frecuente" termina siendo arbitrario.
    conteo = Counter(round(valor, 3) for valor in borde)
    return conteo.most_common(1)[0][0]


def _centroide_por_distancia_fondo(
    imagen: Image.Image, ancho_mm: float, alto_mm: float, umbral: float
) -> Punto:
    """`calcular_matriz_intensidad` (issue #15) ya resuelve exactamente lo
    que este caso necesita -- redimensionar a una grilla manejable y extraer
    un canal de claridad -- asi que se reusa tal cual con `invertir=True`
    (para recibir la claridad 0-1 SIN invertir todavia, ver
    `raster.canal.calcular_matriz_intensidad`) en vez de duplicar ese
    pipeline de resize/canal/gamma. El fondo se detecta sobre esa MISMA
    grilla ya reducida (`_color_de_fondo`); el peso de cada celda es su
    distancia de claridad al fondo, apagada a cero por debajo de `umbral`
    (ruido, no tinta real) -- ver `UMBRAL_DISTANCIA_FONDO_POR_DEFECTO`."""
    if not 0 <= umbral <= 1:
        raise ValueError(
            f"umbral_distancia_fondo debe estar entre 0.0 y 1.0 (recibido: {umbral})."
        )
    config = ConfiguracionRaster(canal=CanalRaster.LUMINANCIA, invertir=True)
    claridad = calcular_matriz_intensidad(imagen, ancho_mm, alto_mm, config)
    fondo = _color_de_fondo(claridad)
    pesos = [[_peso_si_supera_umbral(valor, fondo, umbral) for valor in fila] for fila in claridad]
    return _acumular_centroide(pesos, ancho_mm, alto_mm)


def _peso_si_supera_umbral(valor: float, fondo: float, umbral: float) -> float:
    distancia = abs(valor - fondo)
    return distancia if distancia >= umbral else 0.0


__all__ = ["UMBRAL_DISTANCIA_FONDO_POR_DEFECTO", "centroide_ponderado_imagen"]
