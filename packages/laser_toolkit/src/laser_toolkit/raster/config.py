"""Configuracion de la conversion imagen -> intensidad (issue #15).

Vive separado de `laser_toolkit.config` porque es un tipo puramente del
dominio raster (canal/gamma/posterizado) sin relacion con `SuiteConfig`/
`MachineConfig` -- misma razon por la que `svg.modo.ModoGrabadoSvg` vive en
su propio modulo.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator

# Mismo valor por defecto que `RESOLUCION_RELLENO_MM_POR_DEFECTO` (relleno
# vectorial, `svg.modo`) -- "resolucion" en todo el toolkit siempre significa
# distancia en mm entre muestras/lineas, nunca una cuenta de "lineas por mm"
# (mas fino = numero mas chico), para no introducir una segunda convención.
RESOLUCION_RASTER_MM_POR_DEFECTO = 0.3

# Tope de dimension nativa (en pixeles, el lado mas largo) antes de aplicar
# downscale automatico -- protege la decodificacion Pillow en si (memoria/CPU
# de una funcion serverless de Vercel, #2), independiente de la grilla de
# muestreo final que definen `ancho_mm`/`alto_mm`/`resolucion_mm` (ver
# `raster.canal.calcular_matriz_intensidad`, que redimensiona a esa grilla
# de todas formas). Una imagen que ya viene mas chica que esto no se toca.
DIMENSION_MAXIMA_PX = 2000


class CanalRaster(str, Enum):
    LUMINANCIA = "luminancia"
    ROJO = "rojo"
    VERDE = "verde"
    AZUL = "azul"
    MEZCLA = "mezcla"


class ConfiguracionRaster(BaseModel):
    """Perfil de conversion de una imagen a intensidad de grabado (0.0-1.0,
    donde 1.0 = pixel mas oscuro = mas potencia -- convencion estandar de la
    industria, ver issue #3). El pipeline se aplica en este orden: canal/
    mezcla -> gamma -> invertir -> posterizar."""

    canal: CanalRaster = CanalRaster.LUMINANCIA
    # Solo se usan con canal=MEZCLA -- un peso de 0 en cada uno seria una
    # imagen completamente negra, por eso el default de MEZCLA no es (0,0,0)
    # sino una mezcla neutra (equivalente a promediar los 3 canales).
    peso_rojo: float = Field(default=1 / 3, ge=0, le=1)
    peso_verde: float = Field(default=1 / 3, ge=0, le=1)
    peso_azul: float = Field(default=1 / 3, ge=0, le=1)
    gamma: float = Field(
        default=1.0,
        gt=0,
        description="Curva de contraste sobre la claridad (antes de invertir/posterizar). 1.0 = sin cambio.",
    )
    invertir: bool = Field(
        default=False,
        description=(
            "Direccion de intensidad por defecto es 'pixel mas oscuro = mas potencia' "
            "(negativo fotografico). Con invertir=True se invierte: pixel mas claro = mas potencia."
        ),
    )
    niveles_posterizado: int | None = Field(
        default=None,
        ge=2,
        le=256,
        description="Reduce la intensidad a N niveles discretos. None = modulacion continua (sin reducir).",
    )
    resolucion_mm: float = Field(default=RESOLUCION_RASTER_MM_POR_DEFECTO, gt=0)

    @model_validator(mode="after")
    def _pesos_solo_tienen_sentido_en_mezcla(self) -> ConfiguracionRaster:
        """No es un error usable en si (los pesos se ignoran fuera de MEZCLA),
        pero dejar pesos distintos del default en un canal fijo (ROJO, etc.)
        casi siempre es una confusion del caller -- se avisa temprano en vez
        de ejecutar en silencio con un resultado que no responde a esos pesos."""
        pesos_no_default = (
            self.peso_rojo != 1 / 3 or self.peso_verde != 1 / 3 or self.peso_azul != 1 / 3
        )
        if self.canal != CanalRaster.MEZCLA and pesos_no_default:
            raise ValueError(
                "peso_rojo/peso_verde/peso_azul solo aplican con canal=mezcla "
                f"(canal actual: {self.canal.value})."
            )
        return self
