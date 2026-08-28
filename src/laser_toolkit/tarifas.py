"""Modelo de las tarifas de negocio (Plan Maestro, secciones 6 y 9).

Este es el UNICO lugar del toolkit donde entran valores monetarios. El resto
del sistema solo mide cantidades fisicas (kWh, mm2 de material, horas de
maquina) -- la separacion es deliberada: quien completa este archivo es el
area financiera/comercial, no quien desarrolla o calibra la herramienta.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


def clave_material(material: str, espesor_mm: float) -> str:
    """Clave estandar para indexar `precio_material_por_m2`: "<material>_<espesor>mm"."""
    return f"{material}_{espesor_mm:g}mm"


class TarifasConfig(BaseModel):
    """Tarifas de negocio necesarias para convertir cantidades fisicas medidas en
    costo monetario.

    Cualquier campo puede quedar en `None` (o ausente de `precio_material_por_m2`)
    mientras el area financiera no lo haya definido: el motor de costeo
    (`laser_toolkit.costos`) reporta ese componente como pendiente, nunca
    inventa un valor ni asume cero.
    """

    moneda: str = Field(
        default="TBD",
        description="Unidad monetaria de todos los valores de este archivo (ej. COP, MXN, USD).",
    )
    tarifa_electrica_por_kwh: float | None = Field(
        default=None, description="Costo de la energia electrica, segun el recibo del taller."
    )
    tarifa_hora_maquina: float | None = Field(
        default=None,
        description="Depreciacion + mantenimiento + (opcional) mano de obra, por hora de maquina.",
    )
    precio_material_por_m2: dict[str, float | None] = Field(
        default_factory=dict,
        description=(
            'Precio por m2, indexado por "<material>_<espesor>mm" (ver `clave_material`). '
            "Una entrada en `null` es un material ya identificado pero aun sin precio."
        ),
    )

    @classmethod
    def from_yaml(cls, ruta: str | Path) -> TarifasConfig:
        datos = yaml.safe_load(Path(ruta).read_text(encoding="utf-8")) or {}
        return cls.model_validate(datos)
