"""Modelos de configuracion de una suite de prueba (corte o grabado).

La configuracion vive en un archivo YAML (ver `configs/`) y se valida con pydantic
antes de generar ningun G-code: si algo esta mal escrito en el YAML, el error se
detecta aqui y no despues de mandar un archivo malo a la maquina.
"""

from __future__ import annotations

from enum import Enum
from pathlib import Path

import yaml
from pydantic import BaseModel, Field, field_validator


class Operacion(str, Enum):
    CORTE = "corte"
    GRABADO = "grabado"


class MachineConfig(BaseModel):
    """Constantes del controlador GRBL / LaserGRBL que no cambian entre pruebas.

    Estos valores dependen del firmware cargado en la maquina, no del material
    ni de la prueba puntual -- por eso viven separados en su propio bloque.
    """

    laser_max_s: int = Field(
        default=1000,
        gt=0,
        description=(
            "Valor S maximo del firmware GRBL correspondiente a 100% de potencia "
            "(revisar el parametro $30 de la configuracion GRBL; suele ser 255 o 1000)."
        ),
    )
    travel_feed_mm_min: int = Field(
        default=3000, gt=0, description="Velocidad de desplazamiento en vacio (laser apagado) entre celdas."
    )
    potencia_modulo_w: float = Field(
        default=10.0,
        gt=0,
        description="Potencia optica nominal del modulo laser (W), respaldo de estimacion de energia.",
    )
    factor_utilizacion_laser: float = Field(
        default=1.0,
        gt=0,
        description=(
            "Calibracion tecnica del respaldo de estimacion de energia (Plan Maestro, 6.1): se ajusta "
            "una vez comparando kWh estimados vs. medidos. Parametro tecnico, no una tarifa de negocio."
        ),
    )


class SuiteConfig(BaseModel):
    """Configuracion completa de una corrida de prueba (una suite de corte o de grabado)."""

    material: str
    espesor_mm: float = Field(gt=0)
    operacion: Operacion
    velocidades_mm_min: list[int] = Field(min_length=1)
    potencias_pct: list[int] = Field(min_length=1)
    pasadas: int = Field(default=1, ge=1)
    z_step_mm: float = 0.0
    tamano_celda_mm: float = Field(default=15.0, gt=0)
    espaciado_mm: float = Field(default=5.0, ge=0)
    id_prefijo: str = Field(default="C", min_length=1, max_length=2)
    lote: str = "L01"
    fecha: str | None = Field(
        default=None, description="Formato AAAA-MM-DD. Si se omite, se usa la fecha del dia de generacion."
    )
    machine: MachineConfig = Field(default_factory=lambda: MachineConfig())

    @field_validator("velocidades_mm_min")
    @classmethod
    def _velocidad_positiva(cls, valores: list[int]) -> list[int]:
        for v in valores:
            if v <= 0:
                raise ValueError(f"velocidad debe ser positiva: {v}")
        return valores

    @field_validator("potencias_pct")
    @classmethod
    def _potencia_en_rango(cls, valores: list[int]) -> list[int]:
        for p in valores:
            if not (0 < p <= 100):
                raise ValueError(f"potencia fuera de rango (0, 100]: {p}")
        return valores

    @classmethod
    def from_yaml(cls, ruta: str | Path) -> SuiteConfig:
        datos = yaml.safe_load(Path(ruta).read_text(encoding="utf-8"))
        return cls.model_validate(datos)


class FinalRunConfig(BaseModel):
    """Configuracion de una Final Run (Plan Maestro, seccion 8).

    A diferencia de `SuiteConfig` (un barrido de muchas combinaciones), una
    Final Run usa UNA sola combinacion fija de velocidad/potencia -- la ya
    elegida para produccion -- repetida en celdas fisicamente identicas. Al
    ser todas iguales, el reparto del kWh medido entre celdas deja de ser una
    aproximacion por peso de tiempo (como en una suite de barrido) y pasa a
    ser una division exacta.

    Se ejecuta varias veces de forma INDEPENDIENTE (`ejecucion` = 1, 2, 3...),
    cada una una corrida fisica separada con su propia lectura de medidor, para
    verificar que el consumo sea repetible entre corridas y no solo entre
    celdas de una misma corrida -- ver `laser_toolkit.calibracion`.
    """

    material: str
    espesor_mm: float = Field(gt=0)
    operacion: Operacion
    velocidad_mm_min: int = Field(gt=0)
    potencia_pct: int = Field(gt=0, le=100)
    pasadas: int = Field(default=1, ge=1)
    z_step_mm: float = 0.0
    repeticiones: int = Field(
        default=5,
        ge=1,
        description="Celdas fisicas identicas dentro de esta misma corrida (Plan Maestro, seccion 8).",
    )
    ejecucion: int = Field(
        default=1,
        ge=1,
        description=(
            "Numero de ejecucion independiente de esta Final Run. Se recomienda un minimo de 3 "
            "antes de considerar el valor de energia calibrado."
        ),
    )
    tamano_celda_mm: float = Field(default=15.0, gt=0)
    espaciado_mm: float = Field(default=5.0, ge=0)
    id_prefijo: str = Field(default="F", min_length=1, max_length=2)
    lote: str = "L01"
    fecha: str | None = Field(
        default=None, description="Formato AAAA-MM-DD. Si se omite, se usa la fecha del dia de generacion."
    )
    machine: MachineConfig = Field(default_factory=lambda: MachineConfig())

    @classmethod
    def from_yaml(cls, ruta: str | Path) -> FinalRunConfig:
        datos = yaml.safe_load(Path(ruta).read_text(encoding="utf-8"))
        return cls.model_validate(datos)
