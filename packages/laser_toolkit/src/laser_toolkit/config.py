"""Modelos de configuracion de una suite de prueba (corte o grabado).

La configuracion vive en un archivo YAML (ver `configs/`) y se valida con pydantic
antes de generar ningun G-code: si algo esta mal escrito en el YAML, el error se
detecta aqui y no despues de mandar un archivo malo a la maquina.
"""

from __future__ import annotations

from enum import Enum
from pathlib import Path

import yaml
from pydantic import BaseModel, Field, field_validator, model_validator

# Se importa desde `svg.modo` (no `svg.api`) a proposito: `svg.api` depende de
# `MachineConfig` de este mismo modulo, y ese import si crearia un ciclo.
from laser_toolkit.svg.modo import RESOLUCION_RELLENO_MM_POR_DEFECTO, ModoGrabadoSvg


class Operacion(str, Enum):
    CORTE = "corte"
    GRABADO = "grabado"


class MachineConfig(BaseModel):
    """Constantes del controlador GRBL / LaserGRBL que no cambian entre pruebas.

    Estos valores dependen del firmware cargado en la maquina, no del material
    ni de la prueba puntual -- por eso viven separados en su propio bloque.
    """

    laser_max_s: int = Field(
        default=10000,
        gt=0,
        description=(
            "Valor S maximo del firmware GRBL correspondiente a 100% de potencia "
            "(parametro $30 de la configuracion GRBL de esta maquina: 10000. Puede "
            "variar segun el firmware -- valores comunes son 255, 1000 o 10000)."
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
    punto_focal_mm: float = Field(
        default=0.08,
        gt=0,
        description=(
            "Diametro del punto focal (spot) del modulo, en mm -- 0.08mm en el LT-80W-F45 "
            "(lente de haz comprimido, dato del manual del fabricante). Define el paso de "
            "linea (mm entre pasadas de barrido) que usa "
            "el relleno tipo trama del grabado generico de una suite: un paso mas ancho que "
            "el spot deja franjas sin quemar entre lineas; uno mas angosto que el spot solo "
            "duplica el tiempo de maquina sin grabar mas oscuro. Ver "
            "`laser_toolkit.gcode.writer.grabar_relleno` y "
            "`laser_toolkit.gcode.timing.tiempo_grabado_celda_s`."
        ),
    )
    velocidad_max_mm_min: int = Field(
        default=2000,
        gt=0,
        description=(
            "Velocidad maxima real de los ejes X/Y (parametros $110/$111 de GRBL de esta "
            "maquina). GRBL clampea en silencio cualquier F por encima de esto -- programar "
            "una velocidad mayor no produce una celda mas rapida, produce una celda IDENTICA "
            "a la del limite real, gastando material en una fila de la grilla que no aporta "
            "informacion nueva. `SuiteConfig`/`FinalRunConfig` validan las velocidades "
            "pedidas contra este limite antes de generar G-code."
        ),
    )
    aceleracion_mm_s2: float = Field(
        default=50.0,
        gt=0,
        description=(
            "Aceleracion maxima de los ejes X/Y (parametros $120/$121 de GRBL de esta "
            "maquina, en mm/s^2 -- 50.0 confirmado en la CNC 3018 real de este taller). "
            "Usada para calcular el sobre-recorrido (overscan) del relleno tipo trama de "
            "grabado: la distancia que la maquina necesita para alcanzar la velocidad "
            "programada antes de entrar a la zona visible de la celda -- ver "
            "`laser_toolkit.gcode.writer.grabar_relleno`. Un valor mas chico que la "
            "aceleracion real subestima el sobre-recorrido necesario (menos proteccion "
            "contra el sobre-quemado en los bordes); uno mas grande lo sobreestima (mas "
            "tiempo de maquina de lo necesario, topado por SOBRERECORRIDO_MAX_MM igual)."
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

    svg_path: str | None = Field(
        default=None,
        description=(
            "Ruta a un SVG a usar en cada celda en vez de la geometria generica "
            "(cuadrado de corte, o relleno tipo trama de grabado). En grabado aplica "
            "`modo_grabado_svg`; en corte siempre se traza solo el contorno -- cortar "
            "no admite relleno tipo trama, no tiene sentido fisico 'cortar un rayado'. "
            "Si se omite, corte usa el cuadrado generico y grabado el relleno generico."
        ),
    )
    modo_grabado_svg: ModoGrabadoSvg = Field(
        default=ModoGrabadoSvg.CONTORNO_Y_RELLENO,
        description=(
            "Solo aplica a operacion=grabado con `svg_path` definido: contorno, relleno, "
            "o ambos. Se ignora en corte (corte con `svg_path` siempre traza el contorno)."
        ),
    )
    svg_resolucion_relleno_mm: float = Field(
        default=RESOLUCION_RELLENO_MM_POR_DEFECTO,
        gt=0,
        description="Espaciado entre lineas de relleno del SVG (mm). Solo aplica a grabado con `svg_path`.",
    )

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

    @model_validator(mode="after")
    def _velocidades_dentro_del_limite_real(self) -> SuiteConfig:
        limite = self.machine.velocidad_max_mm_min
        excedidas = sorted({v for v in self.velocidades_mm_min if v > limite})
        if excedidas:
            raise ValueError(
                f"velocidades_mm_min {excedidas} superan el limite real de la maquina "
                f"(machine.velocidad_max_mm_min={limite} mm/min, de $110/$111 en GRBL). "
                "GRBL las clampea en silencio a ese limite: no serian una velocidad "
                "distinta, serian una celda duplicada de la del limite. Bajalas, o si "
                "cambiaste $110/$111 en la maquina, actualiza machine.velocidad_max_mm_min."
            )
        return self

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

    @model_validator(mode="after")
    def _velocidad_dentro_del_limite_real(self) -> FinalRunConfig:
        limite = self.machine.velocidad_max_mm_min
        if self.velocidad_mm_min > limite:
            raise ValueError(
                f"velocidad_mm_min={self.velocidad_mm_min} supera el limite real de la maquina "
                f"(machine.velocidad_max_mm_min={limite} mm/min, de $110/$111 en GRBL). GRBL la "
                "clampea en silencio a ese limite. Bajala, o si cambiaste $110/$111 en la "
                "maquina, actualiza machine.velocidad_max_mm_min."
            )
        return self

    @classmethod
    def from_yaml(cls, ruta: str | Path) -> FinalRunConfig:
        datos = yaml.safe_load(Path(ruta).read_text(encoding="utf-8"))
        return cls.model_validate(datos)
