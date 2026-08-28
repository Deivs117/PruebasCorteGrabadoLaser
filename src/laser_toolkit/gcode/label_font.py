"""Fuente vectorial minima estilo siete-segmentos, para grabar el ID de cada
celda junto a ella (ej. "C-014") y poder identificar cada cupon a simple vista
despues de cortarlo, sin llevar cuenta manual de posiciones.

Soporta digitos 0-9, las letras 'C' y 'G' (prefijos de corte/grabado) y '-'
-- suficiente para los IDs que produce `laser_toolkit.gcode.grid`. Si se
necesitan mas caracteres en el futuro, se agregan como nuevas entradas de
`GLIFOS` sin tocar el resto del modulo.
"""

from __future__ import annotations

Punto = tuple[float, float]
Segmento = tuple[Punto, Punto]

# Segmentos de un digito de siete-segmentos, en unidades relativas a la altura
# del glifo (alto = 1.0, ancho = 0.6). Distribucion clasica:
#   _a_
#  f   b
#   _g_
#  e   c
#   _d_
_SEGMENTOS: dict[str, Segmento] = {
    "a": ((0.0, 1.0), (0.6, 1.0)),
    "b": ((0.6, 1.0), (0.6, 0.5)),
    "c": ((0.6, 0.5), (0.6, 0.0)),
    "d": ((0.0, 0.0), (0.6, 0.0)),
    "e": ((0.0, 0.5), (0.0, 0.0)),
    "f": ((0.0, 1.0), (0.0, 0.5)),
    "g": ((0.0, 0.5), (0.6, 0.5)),
}

GLIFOS: dict[str, tuple[str, ...]] = {
    "0": ("a", "b", "c", "d", "e", "f"),
    "1": ("b", "c"),
    "2": ("a", "b", "g", "e", "d"),
    "3": ("a", "b", "g", "c", "d"),
    "4": ("f", "g", "b", "c"),
    "5": ("a", "f", "g", "c", "d"),
    "6": ("a", "f", "g", "e", "c", "d"),
    "7": ("a", "b", "c"),
    "8": ("a", "b", "c", "d", "e", "f", "g"),
    "9": ("a", "b", "c", "d", "f", "g"),
    "C": ("a", "f", "e", "d"),
    "G": ("a", "f", "e", "d", "c", "g"),
    "-": ("g",),
}


def trazos_texto(texto: str, alto_mm: float, espaciado_mm: float) -> list[Segmento]:
    """Devuelve los segmentos de linea recta (en milimetros) que dibujan `texto`.

    El origen (0, 0) queda en la esquina inferior izquierda del primer caracter.
    Levanta `ValueError` si `texto` contiene un caracter no soportado.
    """
    if alto_mm <= 0:
        raise ValueError("alto_mm debe ser positivo")

    ancho_glifo_mm = alto_mm * 0.6
    trazos: list[Segmento] = []
    cursor_x = 0.0

    for caracter in texto.upper():
        if caracter == " ":
            cursor_x += ancho_glifo_mm + espaciado_mm
            continue

        nombres_segmentos = GLIFOS.get(caracter)
        if nombres_segmentos is None:
            raise ValueError(f"Caracter no soportado por la fuente de grabado: {caracter!r}")

        for nombre in nombres_segmentos:
            (x0, y0), (x1, y1) = _SEGMENTOS[nombre]
            trazos.append(
                (
                    (cursor_x + x0 * alto_mm, y0 * alto_mm),
                    (cursor_x + x1 * alto_mm, y1 * alto_mm),
                )
            )
        cursor_x += ancho_glifo_mm + espaciado_mm

    return trazos
