"""Funciones de alto nivel sobre `grupos_calibracion`, `final_runs` y
`fichas_parametro` (issue #24) -- el flujo de Final Run (Plan Maestro,
sección 8) y su salida final, la Ficha de Parámetro Estándar (F6, #7).
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from laser_toolkit.calibracion import ResumenCalibracion, resumir_calibracion
from laser_toolkit.config import FinalRunConfig, Operacion
from laser_toolkit.costos import costo_energia, costo_material, costo_tiempo_maquina
from laser_toolkit.db.models import EstadoFicha, FamiliaMaterial, FichaParametro, FinalRun, GrupoCalibracion
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.naming import id_grupo_calibracion
from laser_toolkit.tarifas import TarifasConfig


def obtener_o_crear_grupo_calibracion(
    sesion: Session,
    *,
    material: str,
    familia: FamiliaMaterial,
    espesor_mm: float,
    operacion: Operacion,
    velocidad_mm_min: int,
    potencia_pct: int,
) -> GrupoCalibracion:
    """Resuelve el `GrupoCalibracion` de esta combinación, creándolo si es la
    primera vez. El `grupo_calibracion_id` textual se calcula con
    `laser_toolkit.naming.id_grupo_calibracion` -- construir un
    `FinalRunConfig` acá de paso también valida la combinación (ej. contra
    `velocidad_max_mm_min`) con las mismas reglas que ya usa el CLI, en vez
    de reimplementarlas."""
    config = FinalRunConfig(
        material=material,
        espesor_mm=espesor_mm,
        operacion=operacion,
        velocidad_mm_min=velocidad_mm_min,
        potencia_pct=potencia_pct,
    )
    texto_id = id_grupo_calibracion(config)

    existente = sesion.scalar(
        select(GrupoCalibracion).where(GrupoCalibracion.grupo_calibracion_id == texto_id)
    )
    if existente is not None:
        return existente

    material_row = obtener_o_crear_material(sesion, material, familia)
    grupo = GrupoCalibracion(
        grupo_calibracion_id=texto_id,
        material_id=material_row.id,
        espesor_mm=espesor_mm,
        operacion=operacion,
        velocidad_mm_min=velocidad_mm_min,
        potencia_pct=potencia_pct,
    )
    sesion.add(grupo)
    sesion.flush()
    return grupo


def crear_final_run(
    sesion: Session,
    grupo: GrupoCalibracion,
    *,
    ejecucion: int,
    lote: str,
    fecha: date,
    repeticiones: int = 5,
    pasadas: int = 1,
    z_step_mm: float = 0.0,
    tamano_celda_mm: float = 15.0,
    espaciado_mm: float = 5.0,
    id_prefijo: str = "F",
) -> FinalRun:
    """Una ejecución independiente de la Final Run de `grupo` -- ver
    `UniqueConstraint(grupo_calibracion_id, ejecucion)`: no se puede crear la
    misma ejecución dos veces para el mismo grupo."""
    final_run = FinalRun(
        grupo_calibracion_id=grupo.id,
        ejecucion=ejecucion,
        repeticiones=repeticiones,
        pasadas=pasadas,
        z_step_mm=z_step_mm,
        tamano_celda_mm=tamano_celda_mm,
        espaciado_mm=espaciado_mm,
        id_prefijo=id_prefijo,
        lote=lote,
        fecha=fecha,
    )
    sesion.add(final_run)
    sesion.flush()
    return final_run


def resumen_calibracion_de_grupo(
    sesion: Session, grupo: GrupoCalibracion, minimo_ejecuciones: int = 3
) -> ResumenCalibracion:
    """Resumen estadístico entre todas las ejecuciones ya completadas
    (kwh_corrida_medido/tiempo_real_corrida_s cargados) de este grupo -- reusa
    `laser_toolkit.calibracion.resumir_calibracion` tal cual, alimentándolo
    con las filas de `Registro`/`Medicion` en vez de un csv.

    Levanta `ValueError` si alguna ejecución todavía no tiene las mediciones
    de la corrida completa cargadas -- calibrar exige mediciones reales, sin
    respaldo de estimación (igual que la versión basada en csv).

    `resumir_calibracion` espera las mediciones como texto (viene de leer un
    csv originalmente) y trata cualquier string no vacío como "cargado" --
    `str(None)` es `"None"`, no vacío, así que hay que convertir a mano en
    vez de pasar el valor crudo de la columna (`None` cuando falta), o el
    caso "todavía sin medir" nunca se detecta como tal.

    FIX (issue #170): antes de este fix, se armaba UNA fila por `Registro`
    (una por ejecución) con el `kwh_corrida_medido`/`tiempo_real_corrida_s`
    crudo de toda la corrida. `resumir_calibracion` divide por `n_replicas`
    ("cuántas filas comparten el mismo `corrida_id`") -- mecanismo heredado
    del flujo CSV, donde el csv traía una fila POR CELDA (mismo valor
    repetido en cada una) y por eso esa división sí contaba las réplicas
    reales. Acá siempre había una sola fila por `corrida_id`, así que
    `n_replicas` daba 1 y la división nunca corría: el resultado era "kWh
    por CORRIDA completa" (`repeticiones` celdas, default 5), no "kWh por
    unidad/celda" como documenta el Plan Maestro (sección 10.2 -- "el
    reparto del kWh medido dentro de esa corrida... es una división
    exacta"). Se corrige dividiendo acá mismo por la cantidad real de
    celdas medidas de esa corrida (`len(registro.mediciones)`) antes de
    pasarlo a `resumir_calibracion`."""
    filas = []
    for final_run in grupo.final_runs:
        for registro in final_run.registros:
            n_celdas = max(len(registro.mediciones), 1)
            kwh_por_celda = (
                None if registro.kwh_corrida_medido is None else registro.kwh_corrida_medido / n_celdas
            )
            tiempo_por_celda = (
                None
                if registro.tiempo_real_corrida_s is None
                else registro.tiempo_real_corrida_s / n_celdas
            )
            filas.append(
                {
                    "grupo_calibracion_id": grupo.grupo_calibracion_id,
                    "corrida_id": registro.corrida_id,
                    "kwh_corrida_medido": "" if kwh_por_celda is None else str(kwh_por_celda),
                    "tiempo_real_corrida_s": "" if tiempo_por_celda is None else str(tiempo_por_celda),
                }
            )
    return resumir_calibracion(filas, minimo_ejecuciones=minimo_ejecuciones)


def crear_o_actualizar_ficha(
    sesion: Session,
    grupo: GrupoCalibracion,
    *,
    estado: EstadoFicha,
    fecha_validacion: date | None = None,
    notas: str | None = None,
) -> FichaParametro:
    """Un grupo tiene a lo sumo una ficha (relación 1:1, ver `UniqueConstraint`
    en `FichaParametro.grupo_calibracion_id`) -- esta función crea la primera
    vez y actualiza las siguientes, nunca duplica.

    No toca `costo_por_mm`/`costo_por_mm2` (issue #170) -- eso es
    responsabilidad exclusiva de `recalcular_costos_ficha`, para no mezclar
    "guardar lo que el operario decidió a mano" (estado/fecha/notas) con
    "recalcular lo que sale de tarifas + calibración"."""
    ficha = sesion.scalar(select(FichaParametro).where(FichaParametro.grupo_calibracion_id == grupo.id))
    if ficha is None:
        ficha = FichaParametro(grupo_calibracion_id=grupo.id, estado=estado)
        sesion.add(ficha)

    ficha.estado = estado
    if fecha_validacion is not None:
        ficha.fecha_validacion = fecha_validacion
    if notas is not None:
        ficha.notas = notas
    sesion.flush()
    return ficha


def _suma_parcial(componentes: list[float | None]) -> float | None:
    """A diferencia de `costos.costo_total` (todo-o-nada -- correcto para el
    costo final por celda del barrido/Hoja de Registro, donde mostrar un
    total que ignora un componente pendiente subestimaría el costo real sin
    avisar), acá el objetivo es mostrar lo que SÍ está disponible (energía
    y/o tiempo de máquina) aunque falte la tarifa de material -- para eso
    existe `material_costo_pendiente`, que avisa justamente lo que falta en
    vez de bloquear todo el número (bug real de #170: con `costo_total` acá,
    el costo por mm/mm² quedaba en `None` apenas faltaba la tarifa de
    material, aunque la tarifa eléctrica ya estuviera cargada). Devuelve
    `None` solo si NINGÚN componente está disponible."""
    disponibles = [c for c in componentes if c is not None]
    return sum(disponibles) if disponibles else None


def recalcular_costos_ficha(
    sesion: Session, grupo: GrupoCalibracion, tarifas: TarifasConfig
) -> FichaParametro:
    """Recalcula el costo/tiempo por mm cortado (corte) o por mm² grabado
    (grabado) de la Ficha de `grupo`, a partir del promedio calibrado
    (`resumen_calibracion_de_grupo`, TODAS las ejecuciones medidas del
    grupo, no solo las de una Final Run puntual) y las tarifas vigentes
    (issue #170) -- reemplaza al viejo `costo_estandar_total` manual.

    Idempotente y sin side effects de negocio: se puede llamar tanto al
    crear/editar la Ficha como desde la acción explícita "Regenerar costos"
    (útil cuando se carga una tarifa de material que antes faltaba, o
    cambia alguna tarifa). Levanta `ValueError` si el grupo todavía no
    tiene Ficha -- creala primero con `crear_o_actualizar_ficha`.

    La geometría de la celda (`tamano_celda_mm`/`pasadas`) sale de la
    última ejecución del grupo -- todas comparten la misma configuración
    porque "generar siguiente ejecución" siempre repite los parámetros de
    la anterior (ver `apps/api/final_run.generar_siguiente_ejecucion`)."""
    ficha = sesion.scalar(select(FichaParametro).where(FichaParametro.grupo_calibracion_id == grupo.id))
    if ficha is None:
        raise ValueError(f"El grupo {grupo.grupo_calibracion_id} todavía no tiene Ficha -- creala primero.")

    try:
        # Sin mínimo de ejecuciones acá a propósito: el costo se recalcula
        # con lo que haya medido hasta ahora (una Final Run con 1 o 2
        # ejecuciones ya tiene un promedio real, aunque todavía no sea
        # "calibrado" -- eso es una condición aparte, ver `estado` de la
        # Ficha), no hace falta esperar a las 3 mínimas para tener un
        # número mejor que nada.
        resumen = resumen_calibracion_de_grupo(sesion, grupo, minimo_ejecuciones=1)
    except ValueError:
        # Ninguna ejecución medida todavía -- nada que calcular, no falla,
        # los campos de costo quedan en None ("pendiente de calibrar").
        ficha.costo_por_mm = None
        ficha.tiempo_por_mm_s = None
        ficha.costo_por_mm2 = None
        ficha.tiempo_por_mm2_s = None
        ficha.material_costo_pendiente = False
        sesion.flush()
        return ficha

    ultima_ejecucion = max(grupo.final_runs, key=lambda fr: fr.ejecucion)
    tamano_celda_mm = ultima_ejecucion.tamano_celda_mm
    pasadas = ultima_ejecucion.pasadas

    c_energia = costo_energia(resumen.kwh_por_unidad_medio, tarifas)
    c_tiempo_maquina = costo_tiempo_maquina(resumen.tiempo_por_unidad_s_medio, tarifas)

    if grupo.operacion == Operacion.CORTE:
        longitud_mm = 4 * tamano_celda_mm * pasadas
        area_material_mm2 = tamano_celda_mm**2
        c_material = costo_material(area_material_mm2, grupo.material.nombre, grupo.espesor_mm, tarifas)
        costo_celda = _suma_parcial([c_energia, c_material, c_tiempo_maquina])

        ficha.material_costo_pendiente = c_material is None
        ficha.costo_por_mm = round(costo_celda / longitud_mm, 4) if costo_celda is not None else None
        ficha.tiempo_por_mm_s = round(resumen.tiempo_por_unidad_s_medio / longitud_mm, 4)
        ficha.costo_por_mm2 = None
        ficha.tiempo_por_mm2_s = None
    else:  # GRABADO -- no consume material (costo_material ya da 0.0 con área <= 0)
        area_mm2 = tamano_celda_mm**2
        costo_celda = _suma_parcial([c_energia, c_tiempo_maquina])

        ficha.material_costo_pendiente = False
        ficha.costo_por_mm = None
        ficha.tiempo_por_mm_s = None
        ficha.costo_por_mm2 = round(costo_celda / area_mm2, 4) if costo_celda is not None else None
        ficha.tiempo_por_mm2_s = round(resumen.tiempo_por_unidad_s_medio / area_mm2, 4)

    sesion.flush()
    return ficha


def obtener_ficha_vigente(sesion: Session, grupo: GrupoCalibracion) -> FichaParametro | None:
    return sesion.scalar(select(FichaParametro).where(FichaParametro.grupo_calibracion_id == grupo.id))
