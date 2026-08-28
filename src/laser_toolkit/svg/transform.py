"""Escala los subpaths de un SVG (en unidades de usuario del viewBox) a
milimetros, dentro de una caja `ancho_mm x alto_mm`, preservando la
proporcion (equivalente a `object-fit: contain`, centrado).

Voltea el eje Y: en SVG crece hacia abajo; en el resto del toolkit (y en
GRBL) se trata como creciente hacia arriba, igual que `gcode.grid`.
"""

from __future__ import annotations

from dataclasses import dataclass

from laser_toolkit.svg.geometry import Punto, Subpath


@dataclass(frozen=True)
class Transformacion:
    escala: float
    offset_x: float
    offset_y: float
    viewbox_alto: float
    viewbox_min_x: float
    viewbox_min_y: float

    def aplicar(self, punto: Punto) -> Punto:
        x, y = punto
        x_mm = (x - self.viewbox_min_x) * self.escala + self.offset_x
        # Y invertido: el punto mas alto del SVG (y_svg minimo) debe quedar
        # en la Y mas alta en milimetros.
        y_mm = (self.viewbox_alto - (y - self.viewbox_min_y)) * self.escala + self.offset_y
        return (x_mm, y_mm)


def calcular_transformacion(
    viewbox: tuple[float, float, float, float], ancho_mm: float, alto_mm: float
) -> Transformacion:
    """`viewbox = (min_x, min_y, ancho, alto)` en unidades de usuario del SVG."""
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
    )


def aplicar_transformacion(subpaths: list[Subpath], transformacion: Transformacion) -> list[Subpath]:
    return [
        Subpath(puntos=tuple(transformacion.aplicar(p) for p in sp.puntos), cerrado=sp.cerrado)
        for sp in subpaths
    ]
