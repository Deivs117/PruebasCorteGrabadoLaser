"""Schema de Supabase/Postgres (issue #1, diseñado en #22).

Cada tabla referencia de donde sale su forma real -- no son campos
inventados, son un espejo de lo que `laser_toolkit.config`,
`laser_toolkit.io.csv_export`, `laser_toolkit.io.registro`,
`laser_toolkit.naming` y `laser_toolkit.calibracion` ya validan y usan hoy
con archivos. Ver también el Plan Maestro (`docs/Plan Maestro - ...md`).

Decisiones de tipado deliberadas:
- Los campos que en YAML son listas (`velocidades_mm_min`, `potencias_pct`)
  se guardan como `JSON` genérico (no `ARRAY` de Postgres): así el schema es
  portable/testeable contra SQLite en CI sin depender de una Supabase real
  para los tests unitarios de #22/#24. Supabase (Postgres) igual lo guarda
  como `jsonb` sin perder nada -- se puede indexar más adelante si hace falta.
- No hay tabla para "proyectos de diseño" del editor (#18): ese es su propio
  sub-issue de #3, con su propio modelo -- mezclarlo acá haría este schema
  menos legible sin necesidad.
"""

from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from laser_toolkit.config import Operacion
from laser_toolkit.db.base import Base
from laser_toolkit.svg.modo import ModoGrabadoSvg

# ============================================================
# Enums
# ============================================================
#
# `Operacion` y `ModoGrabadoSvg` se REUSAN de `laser_toolkit.config`/
# `laser_toolkit.svg.modo` -- no se redefinen acá. Redefinirlos (como se hizo
# en una version anterior de este archivo) crea dos clases de enum distintas
# con el mismo nombre y los mismos valores de string: pyright las trata como
# tipos incompatibles entre si (`config.Operacion.CORTE` no es asignable a
# `db.models.Operacion`), lo cual rompe justo el codigo que intenta pasar un
# valor de un modulo al otro. `FamiliaMaterial` si es propio de este modulo:
# no existe un equivalente en el backend Python (solo en el catalogo del
# frontend), asi que acá SI es la fuente de la verdad para Python.


class FamiliaMaterial(str, enum.Enum):
    """Espejo de `FamiliaMaterial` en apps/web/src/lib/materiales-catalog.ts."""

    MADERA = "madera"
    POLIMERO = "polimero"
    METAL = "metal"
    OTRO = "otro"


class EstadoFicha(str, enum.Enum):
    """Estado de una Ficha de Parámetro Estándar (F6, issue #7)."""

    OFICIAL = "oficial"
    EN_REVISION = "en_revision"


# ============================================================
# Catálogo
# ============================================================


class Material(Base):
    """Espejo de `data/materiales-catalog.json` (issue #10)."""

    __tablename__ = "materiales"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), unique=True)
    familia: Mapped[FamiliaMaterial] = mapped_column(Enum(FamiliaMaterial, name="familia_material"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    suites: Mapped[list[Suite]] = relationship(back_populates="material")
    grupos_calibracion: Mapped[list[GrupoCalibracion]] = relationship(back_populates="material")
    precios: Mapped[list[PrecioMaterial]] = relationship(back_populates="material")


# ============================================================
# Suites de barrido (espejo de laser_toolkit.config.SuiteConfig)
# ============================================================


class Suite(Base):
    """Una suite de barrido: la 'receta' que genera un `.gcode` + csv hermano
    (`generate-cut`/`generate-engrave`). Espejo 1:1 de `SuiteConfig`."""

    __tablename__ = "suites"

    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materiales.id"))
    espesor_mm: Mapped[float] = mapped_column(Float)
    operacion: Mapped[Operacion] = mapped_column(Enum(Operacion, name="operacion"))

    # Listas -- ver nota de tipado JSON al inicio del archivo.
    velocidades_mm_min: Mapped[list[int]] = mapped_column(JSON)
    potencias_pct: Mapped[list[int]] = mapped_column(JSON)

    pasadas: Mapped[int] = mapped_column(Integer, default=1)
    z_step_mm: Mapped[float] = mapped_column(Float, default=0.0)
    tamano_celda_mm: Mapped[float] = mapped_column(Float, default=15.0)
    espaciado_mm: Mapped[float] = mapped_column(Float, default=5.0)
    id_prefijo: Mapped[str] = mapped_column(String(2), default="C")
    lote: Mapped[str] = mapped_column(String(20))
    fecha: Mapped[date] = mapped_column(Date)

    # SVG opcional (issue #3/#16): key en Supabase Storage, no ruta de disco.
    svg_storage_key: Mapped[str | None] = mapped_column(Text, default=None)
    modo_grabado_svg: Mapped[ModoGrabadoSvg | None] = mapped_column(
        Enum(ModoGrabadoSvg, name="modo_grabado_svg"), default=None
    )
    svg_resolucion_relleno_mm: Mapped[float | None] = mapped_column(Float, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    material: Mapped[Material] = relationship(back_populates="suites")
    registros: Mapped[list[Registro]] = relationship(back_populates="suite")


# ============================================================
# Final Run (espejo de laser_toolkit.config.FinalRunConfig +
# laser_toolkit.naming.id_grupo_calibracion + laser_toolkit.calibracion)
# ============================================================


class GrupoCalibracion(Base):
    """Una combinación material+espesor+operación+velocidad+potencia,
    independiente de la fecha o la ejecución -- espejo exacto de
    `laser_toolkit.naming.id_grupo_calibracion`.

    NOTA (limitación conocida, heredada del código actual, no una decisión
    nueva de este schema): la clave de agrupación NO incluye `pasadas`. Dos
    Final Run con la misma velocidad/potencia pero distinto número de
    pasadas caerían en el mismo grupo. Esto ya es así en
    `laser_toolkit.naming` hoy -- se documenta acá para que quien lo note al
    migrar no piense que es un bug nuevo introducido por el schema.
    """

    __tablename__ = "grupos_calibracion"
    __table_args__ = (
        UniqueConstraint(
            "material_id",
            "espesor_mm",
            "operacion",
            "velocidad_mm_min",
            "potencia_pct",
            name="uq_grupo_calibracion_combinacion",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # `grupo_calibracion_id` textual (ej. "MDF-Trupan_3mm_corte_350mmmin_100pct")
    # se mantiene por compatibilidad con el csv/calibracion.py existente, pero
    # la relación real la da la clave compuesta de abajo (más robusta que
    # parsear un string).
    grupo_calibracion_id: Mapped[str] = mapped_column(String(120), unique=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materiales.id"))
    espesor_mm: Mapped[float] = mapped_column(Float)
    operacion: Mapped[Operacion] = mapped_column(Enum(Operacion, name="operacion_grupo_calibracion"))
    velocidad_mm_min: Mapped[int] = mapped_column(Integer)
    potencia_pct: Mapped[int] = mapped_column(Integer)

    material: Mapped[Material] = relationship(back_populates="grupos_calibracion")
    final_runs: Mapped[list[FinalRun]] = relationship(back_populates="grupo_calibracion")
    ficha_parametro: Mapped[FichaParametro | None] = relationship(back_populates="grupo_calibracion")


class FinalRun(Base):
    """Una ejecución independiente de una Final Run. Espejo de `FinalRunConfig`
    (una Final Run 'completa' calibrada = varias filas de esta tabla que
    comparten `grupo_calibracion_id`, ver `laser_toolkit.calibracion`)."""

    __tablename__ = "final_runs"
    __table_args__ = (UniqueConstraint("grupo_calibracion_id", "ejecucion", name="uq_final_run_ejecucion"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    grupo_calibracion_id: Mapped[int] = mapped_column(ForeignKey("grupos_calibracion.id"))
    ejecucion: Mapped[int] = mapped_column(Integer)
    repeticiones: Mapped[int] = mapped_column(Integer, default=5)
    pasadas: Mapped[int] = mapped_column(Integer, default=1)
    z_step_mm: Mapped[float] = mapped_column(Float, default=0.0)
    tamano_celda_mm: Mapped[float] = mapped_column(Float, default=15.0)
    espaciado_mm: Mapped[float] = mapped_column(Float, default=5.0)
    id_prefijo: Mapped[str] = mapped_column(String(2), default="F")
    lote: Mapped[str] = mapped_column(String(20))
    fecha: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    grupo_calibracion: Mapped[GrupoCalibracion] = relationship(back_populates="final_runs")
    registros: Mapped[list[Registro]] = relationship(back_populates="final_run")


# ============================================================
# Registro / Medición (espejo de CAMPOS_CSV + COLUMNAS_MANUALES + COLUMNAS_COSTEO)
# ============================================================


class Registro(Base):
    """Una corrida física completa (un `corrida_id`). Origen: exactamente UNA
    de `suite` (barrido) o `final_run` -- nunca ambas, nunca ninguna (ver
    CheckConstraint). `kwh_corrida_medido`/`tiempo_real_corrida_s` son las
    dos mediciones manuales de la corrida completa (Plan Maestro, sección 4);
    se prorratean entre `mediciones` por peso de tiempo estimado
    (`laser_toolkit.io.registro.calcular_costos_registro`).
    """

    __tablename__ = "registros"
    __table_args__ = (
        CheckConstraint(
            "(suite_id IS NOT NULL) != (final_run_id IS NOT NULL)",
            name="ck_registro_origen_unico",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    corrida_id: Mapped[str] = mapped_column(String(150), unique=True)
    suite_id: Mapped[int | None] = mapped_column(ForeignKey("suites.id"), default=None)
    final_run_id: Mapped[int | None] = mapped_column(ForeignKey("final_runs.id"), default=None)
    fecha: Mapped[date] = mapped_column(Date)
    lote: Mapped[str] = mapped_column(String(20))

    # Mediciones manuales de la corrida completa (Plan Maestro, sección 4) --
    # NULL mientras no se haya completado el SOP, nunca 0 por defecto.
    kwh_corrida_medido: Mapped[float | None] = mapped_column(Float, default=None)
    tiempo_real_corrida_s: Mapped[float | None] = mapped_column(Float, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    suite: Mapped[Suite | None] = relationship(back_populates="registros")
    final_run: Mapped[FinalRun | None] = relationship(back_populates="registros")
    mediciones: Mapped[list[Medicion]] = relationship(back_populates="registro", cascade="all, delete-orphan")


class Medicion(Base):
    """Una fila del csv hermano / Hoja de Registro -- una celda de la grilla.
    Espejo de `CAMPOS_CSV` + `COLUMNAS_MANUALES` + `COLUMNAS_COSTEO`
    (`laser_toolkit.io.csv_export`, `laser_toolkit.io.registro`)."""

    __tablename__ = "mediciones"
    __table_args__ = (UniqueConstraint("registro_id", "id_prueba", name="uq_medicion_por_registro"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    registro_id: Mapped[int] = mapped_column(ForeignKey("registros.id"))
    id_prueba: Mapped[str] = mapped_column(String(20))  # ej. "C-001", "G-014"

    # Generadas automáticamente por la suite (nunca requieren medición manual).
    velocidad_mm_min: Mapped[int] = mapped_column(Integer)
    potencia_pct: Mapped[int] = mapped_column(Integer)
    pasadas: Mapped[int] = mapped_column(Integer)
    x_mm: Mapped[float] = mapped_column(Float)
    y_mm: Mapped[float] = mapped_column(Float)
    tamano_celda_mm: Mapped[float] = mapped_column(Float)
    area_material_mm2: Mapped[float] = mapped_column(Float)
    tiempo_estimado_celda_s: Mapped[float] = mapped_column(Float)

    # Evaluación manual (Plan Maestro, sección 4.6/5) -- NULL = todavía sin evaluar.
    corte_pasante: Mapped[bool | None] = mapped_column(default=None)
    carbonizacion_1a5: Mapped[int | None] = mapped_column(SmallInteger, default=None)
    foto_storage_key: Mapped[str | None] = mapped_column(Text, default=None)
    notas: Mapped[str | None] = mapped_column(Text, default=None)

    # Costeo granular (laser_toolkit.costos, vía calcular_costos_registro) --
    # derivado de kwh/tiempo de la corrida + configs/tarifas.yaml (ahora tabla
    # `tarifas_historial`/`precios_material`). Se persiste en vez de
    # recalcularse siempre al vuelo, igual que hoy en el csv -- si las tarifas
    # cambian, recalcular es una operación explícita, no automática (para no
    # cambiar costos históricos ya reportados sin que nadie lo pida).
    kwh_celda: Mapped[float | None] = mapped_column(Float, default=None)
    costo_energia_celda: Mapped[float | None] = mapped_column(Float, default=None)
    costo_material_celda: Mapped[float | None] = mapped_column(Float, default=None)
    tiempo_maquina_celda_s: Mapped[float | None] = mapped_column(Float, default=None)
    costo_tiempo_maquina_celda: Mapped[float | None] = mapped_column(Float, default=None)
    costo_total_celda: Mapped[float | None] = mapped_column(Float, default=None)

    registro: Mapped[Registro] = relationship(back_populates="mediciones")
    candidato: Mapped[CandidatoFinalRun | None] = relationship(back_populates="medicion")


# ============================================================
# Candidatos a Final Run (espejo de data/candidatos-final-run.json)
# ============================================================


class CandidatoFinalRun(Base):
    """Espejo de `data/candidatos-final-run.json`. Deliberadamente sin
    columnas denormalizadas (material/espesor/velocidad/potencia): todo eso
    ya está accesible vía `medicion` -> `registro` -> `suite`/`final_run` ->
    `material`; duplicarlo acá invitaría a que se desincronicen."""

    __tablename__ = "candidatos_final_run"

    id: Mapped[int] = mapped_column(primary_key=True)
    medicion_id: Mapped[int] = mapped_column(ForeignKey("mediciones.id"), unique=True)
    marcado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    medicion: Mapped[Medicion] = relationship(back_populates="candidato")


# ============================================================
# Fichas de Parámetro Estándar (F6, issue #7)
# ============================================================


class FichaParametro(Base):
    """Ficha de Parámetro Estándar (Plan Maestro, sección 7/F6). Certifica UN
    `GrupoCalibracion` como la combinación oficial para ese
    material+espesor+operación -- por eso la relación es 1:1, no 1:N (un
    grupo solo puede tener una ficha vigente a la vez; una nueva versión
    reemplaza el estado de la anterior en vez de coexistir)."""

    __tablename__ = "fichas_parametro"

    id: Mapped[int] = mapped_column(primary_key=True)
    grupo_calibracion_id: Mapped[int] = mapped_column(ForeignKey("grupos_calibracion.id"), unique=True)
    costo_estandar_total: Mapped[float | None] = mapped_column(Float, default=None)
    estado: Mapped[EstadoFicha] = mapped_column(
        Enum(EstadoFicha, name="estado_ficha"), default=EstadoFicha.EN_REVISION
    )
    fecha_validacion: Mapped[date | None] = mapped_column(Date, default=None)
    notas: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    grupo_calibracion: Mapped[GrupoCalibracion] = relationship(back_populates="ficha_parametro")


# ============================================================
# Tarifas y precios de material (espejo de laser_toolkit.tarifas.TarifasConfig)
# ============================================================


class TarifasHistorial(Base):
    """Espejo de los campos globales de `TarifasConfig` (moneda, tarifa
    eléctrica, tarifa hora-máquina) -- pero versionado en vez de mutable: el
    Prompt 7 (`docs/ui-design/prompts-stitch.md`) ya pedía un 'historial de
    cambios tipo timeline', así que se modela como tabla de solo-inserción
    desde el arranque en vez de UPDATE-in-place. El valor 'vigente' es la fila
    con `vigente_desde` más reciente."""

    __tablename__ = "tarifas_historial"

    id: Mapped[int] = mapped_column(primary_key=True)
    moneda: Mapped[str] = mapped_column(String(10), default="TBD")
    tarifa_electrica_por_kwh: Mapped[float | None] = mapped_column(Float, default=None)
    tarifa_hora_maquina: Mapped[float | None] = mapped_column(Float, default=None)
    vigente_desde: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PrecioMaterial(Base):
    """Espejo de `TarifasConfig.precio_material_por_m2` (indexado hoy por
    `clave_material` = "<material>_<espesor>mm"; acá la clave es la relación
    real material_id+espesor_mm). Sin versionar por ahora (a diferencia de
    `TarifasHistorial`) -- se puede agregar historial más adelante si hace
    falta, no se sobre-construye desde el arranque."""

    __tablename__ = "precios_material"
    __table_args__ = (UniqueConstraint("material_id", "espesor_mm", name="uq_precio_material_espesor"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materiales.id"))
    espesor_mm: Mapped[float] = mapped_column(Float)
    precio_por_m2: Mapped[float | None] = mapped_column(Float, default=None)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    material: Mapped[Material] = relationship(back_populates="precios")


# ============================================================
# Configuración de máquina (espejo de laser_toolkit.config.MachineConfig + #11)
# ============================================================


class ConfiguracionMaquina(Base):
    """Espejo de `MachineConfig` + los dos campos nuevos de #11/#16 (área de
    trabajo). Fila única activa por ahora -- #11 decidió explícitamente NO
    construir la UI de múltiples perfiles todavía (solo hay una CNC física);
    esta tabla ya deja lugar para eso (agregar una columna `nombre_perfil` y
    quitar la restricción de fila única) sin tener que rediseñar el schema."""

    __tablename__ = "configuracion_maquina"

    id: Mapped[int] = mapped_column(primary_key=True)
    laser_max_s: Mapped[int] = mapped_column(Integer, default=10000)
    travel_feed_mm_min: Mapped[int] = mapped_column(Integer, default=3000)
    potencia_modulo_w: Mapped[float] = mapped_column(Float, default=10.0)
    factor_utilizacion_laser: Mapped[float] = mapped_column(Float, default=1.0)
    punto_focal_mm: Mapped[float] = mapped_column(Float, default=0.08)
    velocidad_max_mm_min: Mapped[int] = mapped_column(Integer, default=2000)
    aceleracion_mm_s2: Mapped[float] = mapped_column(Float, default=50.0)
    # Nuevos por #11/#16: validar en el editor que un diseño no exceda la mesa real.
    area_trabajo_ancho_mm: Mapped[float | None] = mapped_column(Float, default=None)
    area_trabajo_alto_mm: Mapped[float | None] = mapped_column(Float, default=None)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
