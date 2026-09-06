"""Escala los subpaths de un SVG (en unidades de usuario del viewBox) a
milimetros, dentro de una caja `ancho_mm x alto_mm`, preservando la
proporcion (equivalente a `object-fit: contain`, centrado).

Voltea el eje Y: en SVG crece hacia abajo; en el resto del toolkit (y en
GRBL) se trata como creciente hacia arriba, igual que `gcode.grid`.

Issue #16 (lienzo multi-objeto): agrega rotacion arbitraria de un objeto
dentro de su caja `ancho_mm x alto_mm`, alrededor del centro de esa caja.
`rotar_punto` es la pieza reusable -- issue #15 (raster) la reusa tal cual
para rotar el resultado de su barrido en zigzag (generado en espacio local,
sin rotar) en vez de reimplementar la misma trigonometria por separado.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from laser_toolkit.svg.geometry import Punto, Subpath


def rotar_punto(punto: Punto, centro: Punto, angulo_rad: float) -> Punto:
    """Rota `punto` `angulo_rad` radianes (sentido antihorario, matematico)
    alrededor de `centro`. Atajo con `angulo_rad == 0.0` para no pagar el
    costo de la trigonometria en el caso (mayoritario hoy) de un objeto sin
    rotar."""
    if angulo_rad == 0.0:
        return punto
    x, y = punto
    cx, cy = centro
    dx, dy = x - cx, y - cy
    cos_a, sin_a = math.cos(angulo_rad), math.sin(angulo_rad)
    return (cx + dx * cos_a - dy * sin_a, cy + dx * sin_a + dy * cos_a)


@dataclass(frozen=True)
class Transformacion:
    escala: float
    offset_x: float
    offset_y: float
    viewbox_alto: float
    viewbox_min_x: float
    viewbox_min_y: float
    # Rotacion arbitraria del objeto ya escalado/centrado dentro de su caja
    # `ancho_mm x alto_mm` (issue #16), alrededor del centro de esa caja --
    # no del centro del viewBox. Default 0.0/centro (0,0): un objeto sin
    # rotar no paga el costo extra ni cambia su comportamiento previo.
    angulo_rad: float = 0.0
    centro_rotacion: Punto = field(default=(0.0, 0.0))

    def aplicar(self, punto: Punto) -> Punto:
        x, y = punto
        x_mm = (x - self.viewbox_min_x) * self.escala + self.offset_x
        # Y invertido: el punto mas alto del SVG (y_svg minimo) debe quedar
        # en la Y mas alta en milimetros.
        y_mm = (self.viewbox_alto - (y - self.viewbox_min_y)) * self.escala + self.offset_y
        return rotar_punto((x_mm, y_mm), self.centro_rotacion, self.angulo_rad)


def calcular_transformacion(
    viewbox: tuple[float, float, float, float],
    ancho_mm: float,
    alto_mm: float,
    angulo_rad: float = 0.0,
) -> Transformacion:
    """`viewbox = (min_x, min_y, ancho, alto)` en unidades de usuario del SVG.

    `angulo_rad` rota el objeto ya encajado en su caja `ancho_mm x alto_mm`
    alrededor del centro de esa caja (`ancho_mm/2, alto_mm/2`) -- el mismo
    punto sin importar el offset de centrado interno, porque ese offset ya
    es simetrico respecto de ese centro."""
    min_x, min_y, vb_ancho, vb_alto = viewbox
    if vb_ancho <= 0 or vb_alto <= 0:
        raise ValueError(f"viewBox invalido: ancho={vb_ancho}, alto={vb_alto}")

    escala = min(ancho_mm / vb_ancho, alto_mm / vb_alto)
    ancho_real_mm = vb_ancho * escala
    alto_real_mm = vb_alto * escala
    offset_x = (ancho_mm - ancho_real_mm) / 2
    offset_y = (alto_mm - alto_real_mm) / 2

    return Transformacion(
        escala=escala,
        offset_x=offset_x,
        offset_y=offset_y,
        viewbox_alto=vb_alto,
        viewbox_min_x=min_x,
        viewbox_min_y=min_y,
        angulo_rad=angulo_rad,
        centro_rotacion=(ancho_mm / 2, alto_mm / 2),
    )


def aplicar_transformacion(subpaths: list[Subpath], transformacion: Transformacion) -> list[Subpath]:
    return [
        Subpath(puntos=tuple(transformacion.aplicar(p) for p in sp.puntos), cerrado=sp.cerrado)
        for sp in subpaths
    ]
