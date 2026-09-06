"""Funciones de alto nivel sobre `suites`, `registros`, `mediciones` y
`candidatos_final_run` (issue #24) -- el flujo central de una suite de
barrido: generar -> correr -> registrar -> evaluar -> costear -> marcar
candidatos.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from laser_toolkit.config import MachineConfig, Operacion
from laser_toolkit.costos import (
    costo_energia,
    costo_material,
    costo_tiempo_maquina,
    costo_total,
    kwh_estimado_celda,
    prorratear_por_tiempo,
)
from laser_toolkit.db.models import CandidatoFinalRun, FamiliaMaterial, FinalRun, Medicion, Registro, Suite
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.svg.modo import ModoGrabadoSvg
from laser_toolkit.tarifas import TarifasConfig


def crear_suite(
    sesion: Session,
    *,
    material: str,
    familia: FamiliaMaterial,
    espesor_mm: float,
    operacion: Operacion,
    velocidades_mm_min: list[int],
    potencias_pct: list[int],
    lote: str,
    fecha: date,
    pasadas: int = 1,
    z_step_mm: float = 0.0,
    tamano_celda_mm: float = 15.0,
    espaciado_mm: float = 5.0,
    id_prefijo: str = "C",
    svg_storage_key: str | None = None,
    modo_grabado_svg: ModoGrabadoSvg | None = None,
    svg_resolucion_relleno_mm: float | None = None,
) -> Suite:
    """Persiste la 'receta' de una suite de barrido -- espejo de `SuiteConfig`.

    `material`/`familia` se resuelven vía `obtener_o_crear_material`: quien
    llama (ej. el wizard del frontend, a través de #2) no necesita saber si
    el material ya existe en el catálogo o hay que darlo de alta.
    """
    material_row = obtener_o_crear_material(sesion, material, familia)
    suite = Suite(
        material_id=material_row.id,
        espesor_mm=espesor_mm,
        operacion=operacion,
        velocidades_mm_min=velocidades_mm_min,
        potencias_pct=potencias_pct,
        pasadas=pasadas,
        z_step_mm=z_step_mm,
        tamano_celda_mm=tamano_celda_mm,
        espaciado_mm=espaciado_mm,
        id_prefijo=id_prefijo,
        lote=lote,
        fecha=fecha,
        svg_storage_key=svg_storage_key,
        modo_grabado_svg=modo_grabado_svg,
        svg_resolucion_relleno_mm=svg_resolucion_relleno_mm,
    )
    sesion.add(suite)
    sesion.flush()
    return suite


def crear_registro_de_suite(
    sesion: Session, suite: Suite, *, corrida_id: str, fecha: date, lote: str
) -> Registro:
    """Una corrida física que ejecuta esa suite -- ver `CheckConstraint` de
    origen único en `Registro` (exactamente suite XOR final_run)."""
    registro = Registro(corrida_id=corrida_id, suite_id=suite.id, fecha=fecha, lote=lote)
    sesion.add(registro)
    sesion.flush()
    return registro


def crear_registro_de_final_run(
    sesion: Session, final_run: FinalRun, *, corrida_id: str, fecha: date, lote: str
) -> Registro:
    """Una ejecución independiente de Final Run (E, issue #64) -- espejo de
    `crear_registro_de_suite`, pero por el otro lado del XOR de origen (ver
    `CheckConstraint` en `Registro`)."""
    registro = Registro(corrida_id=corrida_id, final_run_id=final_run.id, fecha=fecha, lote=lote)
    sesion.add(registro)
    sesion.flush()
    return registro


def actualizar_suite(
    sesion: Session,
    suite: Suite,
    *,
    material: str,
    familia: FamiliaMaterial,
    espesor_mm: float,
    operacion: Operacion,
    velocidades_mm_min: list[int],
    potencias_pct: list[int],
    lote: str,
    fecha: date,
    pasadas: int = 1,
    z_step_mm: float = 0.0,
    tamano_celda_mm: float = 15.0,
    espaciado_mm: float = 5.0,
    id_prefijo: str = "C",
) -> Suite:
    """Actualiza los campos editables de una Suite existente (B, issue #62) --
    mismo set de campos que `crear_suite`, pero mutando la fila en vez de
    crear una nueva. El llamador (`apps/api/creacion.py`) ya validó con
    `tiene_datos_cargados` que el Registro asociado no tiene ninguna
    medición cargada -- acá no se repite esa validación, es responsabilidad
    de quien orquesta."""
    material_row = obtener_o_crear_material(sesion, material, familia)
    suite.material_id = material_row.id
    suite.espesor_mm = espesor_mm
    suite.operacion = operacion
    suite.velocidades_mm_min = velocidades_mm_min
    suite.potencias_pct = potencias_pct
    suite.pasadas = pasadas
    suite.z_step_mm = z_step_mm
    suite.tamano_celda_mm = tamano_celda_mm
    suite.espaciado_mm = espaciado_mm
    suite.id_prefijo = id_prefijo
    suite.lote = lote
    suite.fecha = fecha
    sesion.flush()
    return suite


def actualizar_registro(
    sesion: Session, registro: Registro, *, corrida_id: str, fecha: date, lote: str
) -> Registro:
    """Al editar una Suite (B), el `corrida_id` puede cambiar (depende de
    material+espesor+operación+fecha+lote, ver `naming.nombre_base`) aunque
    la fila de `Registro` sea la misma -- se actualiza en vez de crear una
    nueva, para no dejar un Registro huérfano ni duplicar candidatos/fotos."""
    registro.corrida_id = corrida_id
    registro.fecha = fecha
    registro.lote = lote
    sesion.flush()
    return registro


def tiene_datos_cargados(registro: Registro) -> bool:
    """True si `registro` (o alguna de sus mediciones) ya tiene evaluación,
    medición de corrida o costeo cargado -- guard de B/#62 antes de editar
    una Suite: pisar esos datos en silencio fue el incidente real que
    motivaba `actualizarSuite`/`corridaYaRegistrada` en el sistema de
    archivos viejo."""
    if registro.kwh_corrida_medido is not None or registro.tiempo_real_corrida_s is not None:
        return True
    return any(
        m.corte_pasante is not None or m.carbonizacion_1a5 is not None or m.costo_total_celda is not None
        for m in registro.mediciones
    )


def reemplazar_mediciones(sesion: Session, registro: Registro, filas: list[dict]) -> list[Medicion]:
    """Descarta las Mediciones actuales de `registro` (el llamador ya validó
    con `tiene_datos_cargados` que ninguna tiene evaluación/costos cargados)
    y registra las nuevas -- usado al editar una Suite (B) cuando cambia la
    grilla de velocidad×potencia, y por lo tanto la cantidad/identidad de
    celdas."""
    for medicion in list(registro.mediciones):
        sesion.delete(medicion)
    sesion.flush()
    return registrar_mediciones_generadas(sesion, registro, filas)


def guardar_gcode_key(sesion: Session, registro: Registro, gcode_storage_key: str) -> Registro:
    """Asocia el `.gcode` ya subido a Supabase Storage (issue #25,
    `laser_toolkit.storage.operaciones.subir_gcode`) con su registro. Deja
    la subida en sí fuera de este módulo a propósito: `repo_pruebas.py` no
    depende de `laser_toolkit.storage` ni de red -- quien orquesta ambos
    pasos (subir, después guardar la key) es el llamador."""
    registro.gcode_storage_key = gcode_storage_key
    sesion.flush()
    return registro


def guardar_foto_medicion_key(sesion: Session, medicion: Medicion, foto_storage_key: str | None) -> Medicion:
    """Asocia (o quita, si `foto_storage_key` es `None`) la foto de una celda
    puntual ya subida a Storage (issue #25/#51, bucket `fotos`). Mismo patrón
    que `guardar_gcode_key`: la subida/borrado del archivo en sí queda del
    lado del llamador."""
    medicion.foto_storage_key = foto_storage_key
    sesion.flush()
    return medicion


def guardar_foto_bateria_key(sesion: Session, registro: Registro, foto_storage_key: str | None) -> Registro:
    """Igual que `guardar_foto_medicion_key`, pero para la foto de toda la
    batería (por corrida, no por celda) -- ver `Registro.foto_bateria_storage_key`."""
    registro.foto_bateria_storage_key = foto_storage_key
    sesion.flush()
    return registro


def registrar_mediciones_generadas(sesion: Session, registro: Registro, filas: list[dict]) -> list[Medicion]:
    """Vuelca las filas ya generadas por una suite (espejo de `CAMPOS_CSV` de
    `laser_toolkit.io.csv_export`) como `Medicion` -- ninguna requiere
    evaluación manual todavía, eso es `completar_evaluacion`."""
    mediciones = [
        Medicion(
            registro_id=registro.id,
            id_prueba=fila["id_prueba"],
            velocidad_mm_min=int(fila["velocidad_mm_min"]),
            potencia_pct=int(fila["potencia_pct"]),
            pasadas=int(fila["pasadas"]),
            x_mm=float(fila["x_mm"]),
            y_mm=float(fila["y_mm"]),
            tamano_celda_mm=float(fila["tamano_celda_mm"]),
            area_material_mm2=float(fila["area_material_mm2"]),
            tiempo_estimado_celda_s=float(fila["tiempo_estimado_celda_s"]),
        )
        for fila in filas
    ]
    sesion.add_all(mediciones)
    sesion.flush()
    return mediciones


def completar_evaluacion(
    sesion: Session,
    medicion: Medicion,
    *,
    corte_pasante: bool | None = None,
    carbonizacion_1a5: int | None = None,
    foto_storage_key: str | None = None,
    notas: str | None = None,
) -> Medicion:
    """Agrega la evaluación manual del taller (Plan Maestro, sección 4/5) a
    una celda ya generada. Solo pisa los campos que se pasan explícitos (no
    `None` por omisión) -- llamar dos veces para completar distintos campos
    en distintos momentos no borra lo que ya se había cargado."""
    if corte_pasante is not None:
        medicion.corte_pasante = corte_pasante
    if carbonizacion_1a5 is not None:
        medicion.carbonizacion_1a5 = carbonizacion_1a5
    if foto_storage_key is not None:
        medicion.foto_storage_key = foto_storage_key
    if notas is not None:
        medicion.notas = notas
    sesion.flush()
    return medicion


def completar_medicion_corrida(
    sesion: Session, registro: Registro, *, kwh_corrida_medido: float, tiempo_real_corrida_s: float
) -> Registro:
    """Las dos mediciones manuales de la corrida COMPLETA (no de una celda) --
    Plan Maestro, sección 4. Se guardan una sola vez por `Registro`, a
    diferencia del csv plano donde se repetían en cada fila."""
    registro.kwh_corrida_medido = kwh_corrida_medido
    registro.tiempo_real_corrida_s = tiempo_real_corrida_s
    sesion.flush()
    return registro


def calcular_y_guardar_costos_registro(
    sesion: Session, registro: Registro, tarifas: TarifasConfig, machine: MachineConfig | None = None
) -> list[Medicion]:
    """Costeo granular de todas las mediciones de un registro -- espejo de
    `laser_toolkit.io.registro.calcular_costos_registro`, pero operando
    sobre las filas de la base en vez de un csv. Reusa `laser_toolkit.costos`
    tal cual: ningún cálculo nuevo, solo el punto de entrada de datos cambia.

    A diferencia del csv plano, acá no hace falta validar "el mismo valor en
    todas las filas" (`_valor_unico_de_grupo` en `io.registro`) -- ese era un
    parche para un formato donde la medición de la corrida completa se
    repetía en cada fila. En el schema normalizado, `kwh_corrida_medido`/
    `tiempo_real_corrida_s` viven UNA sola vez en `Registro`; la garantía de
    unicidad la da el modelo de datos, no una validación en tiempo de lectura.
    """
    machine = machine or MachineConfig()
    mediciones = list(registro.mediciones)
    if not mediciones:
        return []

    kwh_corrida = registro.kwh_corrida_medido
    tiempo_real_corrida = registro.tiempo_real_corrida_s
    pesos = [m.tiempo_estimado_celda_s for m in mediciones]

    if kwh_corrida is not None:
        kwh_por_celda = prorratear_por_tiempo(kwh_corrida, pesos)
    else:
        kwh_por_celda = [
            kwh_estimado_celda(peso, m.potencia_pct, machine)
            for peso, m in zip(pesos, mediciones, strict=True)
        ]
    tiempo_maquina_por_celda = (
        prorratear_por_tiempo(tiempo_real_corrida, pesos) if tiempo_real_corrida is not None else pesos
    )

    material_nombre = registro.suite.material.nombre if registro.suite else ""
    espesor_mm = registro.suite.espesor_mm if registro.suite else 0.0

    for medicion, kwh_celda, tiempo_maquina_s in zip(
        mediciones, kwh_por_celda, tiempo_maquina_por_celda, strict=True
    ):
        c_energia = costo_energia(kwh_celda, tarifas)
        c_material = costo_material(medicion.area_material_mm2, material_nombre, espesor_mm, tarifas)
        c_tiempo = costo_tiempo_maquina(tiempo_maquina_s, tarifas)
        medicion.kwh_celda = round(kwh_celda, 6)
        medicion.costo_energia_celda = round(c_energia, 4) if c_energia is not None else None
        medicion.costo_material_celda = round(c_material, 4) if c_material is not None else None
        medicion.tiempo_maquina_celda_s = round(tiempo_maquina_s, 2)
        medicion.costo_tiempo_maquina_celda = round(c_tiempo, 4) if c_tiempo is not None else None
        medicion.costo_total_celda = costo_total([c_energia, c_material, c_tiempo])

    sesion.flush()
    return mediciones


def marcar_candidato(sesion: Session, medicion: Medicion) -> CandidatoFinalRun:
    """Marca una celda como candidata a Final Run -- espejo de agregar una
    entrada a `data/candidatos-final-run.json`. Idempotente: marcar dos veces
    la misma medición devuelve el candidato ya existente en vez de fallar."""
    existente = sesion.scalar(select(CandidatoFinalRun).where(CandidatoFinalRun.medicion_id == medicion.id))
    if existente is not None:
        return existente
    candidato = CandidatoFinalRun(medicion_id=medicion.id)
    sesion.add(candidato)
    sesion.flush()
    return candidato


def desmarcar_candidato(sesion: Session, medicion: Medicion) -> None:
    existente = sesion.scalar(select(CandidatoFinalRun).where(CandidatoFinalRun.medicion_id == medicion.id))
    if existente is not None:
        sesion.delete(existente)
        sesion.flush()


def listar_candidatos(sesion: Session) -> list[CandidatoFinalRun]:
    return list(sesion.scalars(select(CandidatoFinalRun).order_by(CandidatoFinalRun.marcado_en)))
