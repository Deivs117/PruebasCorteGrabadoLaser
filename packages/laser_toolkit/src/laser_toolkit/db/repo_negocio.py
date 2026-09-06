"""Funciones de alto nivel sobre `tarifas_historial`, `precios_material` y
`configuracion_maquina` (issue #24) -- y los dos puentes que arman un
`TarifasConfig`/`MachineConfig` a partir de la base, para que
`laser_toolkit.costos` y el resto del toolkit puramente-funcional no se
enteren de que ahora los datos vienen de Postgres en vez de un YAML.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from laser_toolkit.config import MachineConfig
from laser_toolkit.db.models import ConfiguracionMaquina, Material, PrecioMaterial, TarifasHistorial
from laser_toolkit.tarifas import TarifasConfig, clave_material


def registrar_tarifas(
    sesion: Session, *, moneda: str, tarifa_electrica_por_kwh: float | None, tarifa_hora_maquina: float | None
) -> TarifasHistorial:
    """`tarifas_historial` es de solo inserción (ver docstring del modelo) --
    esto SIEMPRE agrega una fila nueva, nunca actualiza una existente."""
    fila = TarifasHistorial(
        moneda=moneda,
        tarifa_electrica_por_kwh=tarifa_electrica_por_kwh,
        tarifa_hora_maquina=tarifa_hora_maquina,
    )
    sesion.add(fila)
    sesion.flush()
    return fila


def obtener_tarifas_vigentes(sesion: Session) -> TarifasHistorial | None:
    """La fila más reciente -- `None` si todavía no se cargó ninguna (el área
    financiera no completó nada aún).

    Desempata por `id` además de `vigente_desde`: dos inserciones seguidas
    (ej. en el mismo test, o dos requests casi simultáneos) pueden caer en el
    mismo segundo -- la resolución de `CURRENT_TIMESTAMP` no alcanza para
    distinguirlas, pero el autoincremento de `id` sí, con garantía de reflejar
    el orden real de inserción."""
    return sesion.scalar(
        select(TarifasHistorial)
        .order_by(TarifasHistorial.vigente_desde.desc(), TarifasHistorial.id.desc())
        .limit(1)
    )


def fijar_precio_material(
    sesion: Session, material: Material, espesor_mm: float, precio_por_m2: float | None
) -> PrecioMaterial:
    """Crea o actualiza el precio de `material`+`espesor_mm` (unique
    constraint en esa combinación)."""
    fila = sesion.scalar(
        select(PrecioMaterial).where(
            PrecioMaterial.material_id == material.id, PrecioMaterial.espesor_mm == espesor_mm
        )
    )
    if fila is None:
        fila = PrecioMaterial(material_id=material.id, espesor_mm=espesor_mm)
        sesion.add(fila)
    fila.precio_por_m2 = precio_por_m2
    sesion.flush()
    return fila


def construir_tarifas_config(sesion: Session) -> TarifasConfig:
    """Arma un `TarifasConfig` (el mismo tipo que antes venía de
    `configs/tarifas.yaml`) a partir de las tablas de negocio -- el puente
    que permite seguir usando `laser_toolkit.costos` sin cambiarlo."""
    vigentes = obtener_tarifas_vigentes(sesion)
    precios = {
        clave_material(precio.material.nombre, precio.espesor_mm): precio.precio_por_m2
        for precio in sesion.scalars(select(PrecioMaterial))
    }
    if vigentes is None:
        return TarifasConfig(precio_material_por_m2=precios)
    return TarifasConfig(
        moneda=vigentes.moneda,
        tarifa_electrica_por_kwh=vigentes.tarifa_electrica_por_kwh,
        tarifa_hora_maquina=vigentes.tarifa_hora_maquina,
        precio_material_por_m2=precios,
    )


def obtener_configuracion_maquina(sesion: Session) -> ConfiguracionMaquina:
    """Fila única activa (#11 decidió no construir multi-perfil todavía) --
    la crea con los defaults de `MachineConfig` si todavía no existe, para
    que el resto del sistema nunca tenga que manejar el caso "no hay
    configuración de máquina todavía"."""
    fila = sesion.scalar(select(ConfiguracionMaquina).limit(1))
    if fila is not None:
        return fila
    defaults = MachineConfig()
    fila = ConfiguracionMaquina(
        laser_max_s=defaults.laser_max_s,
        travel_feed_mm_min=defaults.travel_feed_mm_min,
        potencia_modulo_w=defaults.potencia_modulo_w,
        factor_utilizacion_laser=defaults.factor_utilizacion_laser,
        punto_focal_mm=defaults.punto_focal_mm,
        velocidad_max_mm_min=defaults.velocidad_max_mm_min,
        aceleracion_mm_s2=defaults.aceleracion_mm_s2,
    )
    sesion.add(fila)
    sesion.flush()
    return fila


def construir_machine_config(sesion: Session) -> MachineConfig:
    """Arma un `MachineConfig` a partir de `configuracion_maquina` -- mismo
    puente que `construir_tarifas_config`, para el generador de G-code."""
    fila = obtener_configuracion_maquina(sesion)
    return MachineConfig(
        laser_max_s=fila.laser_max_s,
        travel_feed_mm_min=fila.travel_feed_mm_min,
        potencia_modulo_w=fila.potencia_modulo_w,
        factor_utilizacion_laser=fila.factor_utilizacion_laser,
        punto_focal_mm=fila.punto_focal_mm,
        velocidad_max_mm_min=fila.velocidad_max_mm_min,
        aceleracion_mm_s2=fila.aceleracion_mm_s2,
    )
