"""Endpoints de LECTURA: materiales/tarifas/candidatos (#48), suites y
dashboard (A, issue #54), Hoja de Registro/Costeo (C, #60), Historial (D,
#63) y Final Run/Calibración (E, #64).

Cada función arma directamente el JSON que espera el `lib/*.ts` equivalente
de `apps/web` (mismos nombres de campo en camelCase que ya usan los
componentes), para no tener que tocar las páginas que los consumen -- solo
cambia de dónde sale el dato (Supabase en vez de `data/`/`configs/`).
"""

from __future__ import annotations

import statistics

from laser_toolkit.db.models import (
    CandidatoFinalRun,
    EstadoFicha,
    FamiliaMaterial,
    FichaParametro,
    GrupoCalibracion,
    Material,
    Medicion,
    PrecioMaterial,
    Registro,
    Suite,
)
from laser_toolkit.db.repo_calibracion import (
    obtener_ficha_vigente,
    resumen_calibracion_de_grupo,
)
from laser_toolkit.db.repo_materiales import listar_materiales
from laser_toolkit.db.repo_negocio import obtener_configuracion_maquina, obtener_tarifas_vigentes
from laser_toolkit.db.repo_pruebas import listar_candidatos
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def materiales_catalogo(sesion: Session) -> list[dict]:
    return [{"nombre": m.nombre, "familia": m.familia.value} for m in listar_materiales(sesion)]


def tarifas_vigentes(sesion: Session) -> dict:
    """Espejo de `leerTarifas` en `tarifas-data.ts`. Sin fila todavía (nadie
    cargó tarifas aún) devuelve la misma forma "vacía" que el YAML ausente."""
    fila = obtener_tarifas_vigentes(sesion)
    if fila is None:
        return {
            "moneda": "",
            "tarifaElectricaPorKwh": "",
            "tarifaHoraMaquina": "",
            "preciosMaterial": [],
        }

    precios = sesion.execute(
        select(Material.nombre, PrecioMaterial.espesor_mm, PrecioMaterial.precio_por_m2).join(
            Material, PrecioMaterial.material_id == Material.id
        )
    ).all()
    return {
        "moneda": fila.moneda,
        "tarifaElectricaPorKwh": (
            str(fila.tarifa_electrica_por_kwh) if fila.tarifa_electrica_por_kwh is not None else ""
        ),
        "tarifaHoraMaquina": (str(fila.tarifa_hora_maquina) if fila.tarifa_hora_maquina is not None else ""),
        "preciosMaterial": [
            {
                "material": nombre,
                "espesorMm": str(espesor),
                "precio": str(precio) if precio is not None else "",
            }
            for nombre, espesor, precio in precios
        ],
    }


def configuracion_maquina(sesion: Session) -> dict:
    """Espejo de `leerMaquina` en `maquina-data.ts`. A diferencia de tarifas,
    `obtener_configuracion_maquina` nunca devuelve `None` -- crea la fila con
    los defaults de `MachineConfig` (issue #11) la primera vez, así que acá
    siempre hay algo que mostrar."""
    fila = obtener_configuracion_maquina(sesion)
    return {
        "laserMaxS": fila.laser_max_s,
        "travelFeedMmMin": fila.travel_feed_mm_min,
        "potenciaModuloW": fila.potencia_modulo_w,
        "factorUtilizacionLaser": fila.factor_utilizacion_laser,
        "puntoFocalMm": fila.punto_focal_mm,
        "velocidadMaxMmMin": fila.velocidad_max_mm_min,
        "aceleracionMmS2": fila.aceleracion_mm_s2,
        "areaTrabajoAnchoMm": fila.area_trabajo_ancho_mm,
        "areaTrabajoAltoMm": fila.area_trabajo_alto_mm,
    }


def candidato_a_dict(candidato: CandidatoFinalRun) -> dict | None:
    """Espejo de una entrada de `data/candidatos-final-run.json`. `None` si el
    candidato quedó huérfano de un Registro sin Suite (no debería pasar en el
    flujo normal, pero no vale la pena reventar el listado por eso)."""
    medicion = candidato.medicion
    registro = medicion.registro
    suite = registro.suite
    if suite is None:
        return None
    return {
        "id": f"{registro.corrida_id}::{medicion.id_prueba}",
        "corridaId": registro.corrida_id,
        "idPrueba": medicion.id_prueba,
        "archivo": f"{registro.corrida_id}_registro.csv",
        "material": suite.material.nombre,
        "espesorMm": str(suite.espesor_mm),
        "operacion": suite.operacion.value,
        "velocidadMmMin": str(medicion.velocidad_mm_min),
        "potenciaPct": str(medicion.potencia_pct),
        "marcadoEn": candidato.marcado_en.isoformat(),
    }


def candidatos_final_run(sesion: Session) -> list[dict]:
    """Espejo de `listarCandidatos` en `candidatos-final-run.ts`, ordenado
    igual (más reciente primero) -- `repo_pruebas.listar_candidatos` devuelve
    ascendente por `marcado_en`, por eso se invierte acá."""
    candidatos = [candidato_a_dict(c) for c in reversed(listar_candidatos(sesion))]
    return [c for c in candidatos if c is not None]


def suites(sesion: Session) -> list[dict]:
    """Espejo de `listarSuites` en `fs-data.ts`. La tabla `suites` (issue #22)
    solo describe barridos -- Final Run es otra tabla (`final_runs`, (E) del
    plan de #2), así que no hace falta filtrar por "tipo" como en el YAML."""
    filas = sesion.scalars(select(Suite).order_by(Suite.created_at.desc()))
    resultado = []
    for suite in filas:
        registro = suite.registros[0] if suite.registros else None
        resultado.append(
            {
                "id": suite.id,
                "material": suite.material.nombre,
                "espesorMm": suite.espesor_mm,
                "operacion": suite.operacion.value,
                "velocidadesMmMin": suite.velocidades_mm_min,
                "potenciasPct": suite.potencias_pct,
                "lote": suite.lote,
                "creadoEn": suite.created_at.isoformat(),
                "corridaId": registro.corrida_id if registro else None,
                "gcodeStorageKey": registro.gcode_storage_key if registro else None,
            }
        )
    return resultado


def suite_detalle(sesion: Session, suite_id: int) -> dict | None:
    """Forma que espera el wizard (`SuiteFormData`) para prefillear "Editar"
    (B) o "Duplicar" (A) -- espejo de `leerSuiteEditable` en `generar-suite.ts`.
    `svgPath`/`modoGrabadoSvg`/`svgResolucionRellenoMm` quedan pendientes de
    cuando el editor SVG (#3) suba a Storage en vez de a `assets/svg/`."""
    suite = sesion.get(Suite, suite_id)
    if suite is None:
        return None
    return {
        "operacion": suite.operacion.value,
        "material": suite.material.nombre,
        "espesorMm": suite.espesor_mm,
        "lote": suite.lote,
        "velocidadesMmMin": suite.velocidades_mm_min,
        "potenciasPct": suite.potencias_pct,
        "pasadas": suite.pasadas,
        "tamanoCeldaMm": suite.tamano_celda_mm,
        "espaciadoMm": suite.espaciado_mm,
    }


def _contexto_registro(registro: Registro) -> tuple[str, float, str]:
    """(material, espesor_mm, operación) sin importar el origen del
    Registro -- Suite (barrido) o FinalRun (E, #64) comparten la misma
    Hoja de Registro/Costeo (C) y el mismo Historial (D)."""
    if registro.suite is not None:
        suite = registro.suite
        return suite.material.nombre, suite.espesor_mm, suite.operacion.value
    if registro.final_run is not None:
        grupo = registro.final_run.grupo_calibracion
        return grupo.material.nombre, grupo.espesor_mm, grupo.operacion.value
    raise ValueError(f"El registro {registro.corrida_id} no tiene Suite ni FinalRun asociado.")


def _celda_editable(medicion: Medicion) -> dict:
    return {
        "idPrueba": medicion.id_prueba,
        "velocidadMmMin": str(medicion.velocidad_mm_min),
        "potenciaPct": str(medicion.potencia_pct),
        "cortePasante": (
            "" if medicion.corte_pasante is None else ("si" if medicion.corte_pasante else "no")
        ),
        "carbonizacion1a5": (
            "" if medicion.carbonizacion_1a5 is None else str(medicion.carbonizacion_1a5)
        ),
        "fotoStorageKey": medicion.foto_storage_key or "",
        "notas": medicion.notas or "",
    }


def registros(sesion: Session) -> list[dict]:
    """Espejo de `listarCorridas` en `registro-data.ts`, pero sin la
    distinción "generadas vs preparadas": una suite creada (#56) ya nace con
    su Registro y sus Mediciones completas (ver el hallazgo del plan
    reordenado de #2), así que solo hay un tipo de fila acá. Incluye
    corridas de Suite y de FinalRun (E) por igual -- Hoja de Registro nunca
    distinguió el origen en el sistema de archivos viejo."""
    filas = sesion.scalars(select(Registro).order_by(Registro.created_at.desc()))
    resultado = []
    for registro in filas:
        material, espesor_mm, operacion = _contexto_registro(registro)
        mediciones = registro.mediciones
        evaluadas = sum(1 for m in mediciones if m.corte_pasante is not None and m.carbonizacion_1a5 is not None)
        costeadas = sum(1 for m in mediciones if m.costo_total_celda is not None)
        resultado.append(
            {
                "corridaId": registro.corrida_id,
                # "suite" | "finalRun" -- Hoja de Registro usa esto para no
                # ofrecer "Eliminar corrida" en una ejecución de Final Run
                # (se elimina en grupo completo, desde Final Run).
                "origen": "suite" if registro.suite_id is not None else "finalRun",
                "material": material,
                "espesorMm": str(espesor_mm),
                "operacion": operacion,
                "lote": registro.lote,
                "totalCeldas": len(mediciones),
                "celdasEvaluadas": evaluadas,
                "costeado": len(mediciones) > 0 and costeadas == len(mediciones),
                "creadoEn": registro.created_at.isoformat(),
            }
        )
    return resultado


def registro_detalle(sesion: Session, corrida_id: str) -> dict | None:
    """Forma que espera `RegistroEditor` (Hoja de Registro, C) -- el
    equivalente normalizado de un `_registro.csv`."""
    registro = sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id))
    if registro is None:
        return None
    material, espesor_mm, operacion = _contexto_registro(registro)
    return {
        "corridaId": registro.corrida_id,
        "material": material,
        "espesorMm": str(espesor_mm),
        "operacion": operacion,
        "lote": registro.lote,
        "pasadas": registro.suite.pasadas if registro.suite else registro.final_run.pasadas,
        "kwhCorridaMedido": (
            "" if registro.kwh_corrida_medido is None else str(registro.kwh_corrida_medido)
        ),
        "tiempoRealCorridaS": (
            "" if registro.tiempo_real_corrida_s is None else str(registro.tiempo_real_corrida_s)
        ),
        "fotoBateriaStorageKey": registro.foto_bateria_storage_key or "",
        "celdas": [_celda_editable(m) for m in registro.mediciones],
    }


def _costo_str(valor: float | None) -> str:
    return "" if valor is None else str(valor)


def costeo_detalle(sesion: Session, corrida_id: str) -> dict | None:
    """Espejo de `leerCosteo` en `costeo-data.ts` -- costos ya calculados por
    `calcular_y_guardar_costos_registro`. `None` si el registro no existe o
    todavía no se calculó ningún costo."""
    registro = sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id))
    if registro is None:
        return None
    material, espesor_mm, operacion = _contexto_registro(registro)
    return {
        "corridaId": registro.corrida_id,
        "material": material,
        "espesorMm": str(espesor_mm),
        "operacion": operacion,
        "lote": registro.lote,
        "celdas": [
            {
                "idPrueba": m.id_prueba,
                "velocidadMmMin": str(m.velocidad_mm_min),
                "potenciaPct": str(m.potencia_pct),
                "costoEnergiaCelda": _costo_str(m.costo_energia_celda),
                "costoMaterialCelda": _costo_str(m.costo_material_celda),
                "costoTiempoMaquinaCelda": _costo_str(m.costo_tiempo_maquina_celda),
                "costoTotalCelda": _costo_str(m.costo_total_celda),
            }
            for m in registro.mediciones
        ],
    }


def panorama_familias(sesion: Session) -> list[dict]:
    """Observabilidad de alto nivel por `FamiliaMaterial` (D reestructurado,
    issue #12) -- el panorama sin filtros/export; el detalle por
    material+espesor+operación puntual es #13 (Reportes), no acá.

    Siempre devuelve las 4 familias, en el orden del enum, incluso sin
    ningún dato todavía -- "nunca ocultar la familia ni inventar un cero
    engañoso" (issue): los campos de rango/promedio quedan `None` (el
    frontend los muestra como "sin datos", no como 0).
    """
    familia_por_material = {m.nombre: m.familia for m in sesion.scalars(select(Material))}

    materiales_por_familia: dict[FamiliaMaterial, set[str]] = {f: set() for f in FamiliaMaterial}
    for nombre, familia in familia_por_material.items():
        materiales_por_familia[familia].add(nombre)

    corridas_por_familia: dict[FamiliaMaterial, int] = {f: 0 for f in FamiliaMaterial}
    evaluadas_por_familia: dict[FamiliaMaterial, int] = {f: 0 for f in FamiliaMaterial}
    costeadas_por_familia: dict[FamiliaMaterial, int] = {f: 0 for f in FamiliaMaterial}
    costos_por_familia: dict[FamiliaMaterial, list[float]] = {f: [] for f in FamiliaMaterial}

    for registro in sesion.scalars(select(Registro)):
        material_nombre, _, _ = _contexto_registro(registro)
        # Fallback defensivo, igual que #10 (materiales-catalog.ts): un
        # registro real nunca se pierde de esta cuenta aunque su material,
        # por lo que sea, no esté en el catálogo.
        familia = familia_por_material.get(material_nombre, FamiliaMaterial.OTRO)
        corridas_por_familia[familia] += 1
        for medicion in registro.mediciones:
            if medicion.corte_pasante is not None and medicion.carbonizacion_1a5 is not None:
                evaluadas_por_familia[familia] += 1
            if medicion.costo_total_celda is not None:
                costeadas_por_familia[familia] += 1
                costos_por_familia[familia].append(medicion.costo_total_celda)

    # kwh/unidad calibrado: solo cuenta un GrupoCalibracion cuyo resumen
    # estadístico ya es `calibrado` (>= mínimo de ejecuciones medidas, ver
    # `resumen_calibracion_de_grupo`) -- un grupo con Final Run incompleta
    # levanta ValueError (mediciones reales sin respaldo de estimación), se
    # trata igual que "todavía no calibrado", nunca como error de la página.
    kwh_por_familia: dict[FamiliaMaterial, list[float]] = {f: [] for f in FamiliaMaterial}
    for grupo in sesion.scalars(select(GrupoCalibracion)):
        try:
            resumen = resumen_calibracion_de_grupo(sesion, grupo)
        except ValueError:
            continue
        if resumen.calibrado:
            kwh_por_familia[grupo.material.familia].append(resumen.kwh_por_unidad_medio)

    resultado = []
    for familia in FamiliaMaterial:
        costos = costos_por_familia[familia]
        kwhs = kwh_por_familia[familia]
        resultado.append(
            {
                "familia": familia.value,
                "materialesDistintos": len(materiales_por_familia[familia]),
                "corridas": corridas_por_familia[familia],
                "pruebasEvaluadas": evaluadas_por_familia[familia],
                "pruebasCosteadas": costeadas_por_familia[familia],
                "kwhPorUnidadMin": _costo_str(min(kwhs) if kwhs else None),
                "kwhPorUnidadMax": _costo_str(max(kwhs) if kwhs else None),
                "costoPorCeldaMin": _costo_str(min(costos) if costos else None),
                "costoPorCeldaMax": _costo_str(max(costos) if costos else None),
                "costoPorCeldaPromedio": _costo_str(statistics.mean(costos) if costos else None),
            }
        )
    return resultado


def fichas_parametro(sesion: Session) -> list[dict]:
    """Espejo de `listarFichas` en `fichas-data.ts` (F6, issue #7): todas las
    Fichas de Parámetro que ya existen (oficiales o en revisión), con el
    contexto de su `GrupoCalibracion` para el grid/detalle -- a diferencia
    de `grupos_calibracion`, acá solo entran los grupos que ya tienen una
    Ficha creada (ver `FichaParametro.grupo_calibracion`, relación 1:1)."""
    fichas = sesion.scalars(
        select(FichaParametro).join(GrupoCalibracion).order_by(GrupoCalibracion.material_id, GrupoCalibracion.id)
    )
    return [
        {
            "grupoId": ficha.grupo_calibracion.grupo_calibracion_id,
            "material": ficha.grupo_calibracion.material.nombre,
            "espesorMm": str(ficha.grupo_calibracion.espesor_mm),
            "operacion": ficha.grupo_calibracion.operacion.value,
            "velocidadMmMin": str(ficha.grupo_calibracion.velocidad_mm_min),
            "potenciaPct": str(ficha.grupo_calibracion.potencia_pct),
            "estado": ficha.estado.value,
            "costoEstandarTotal": (str(ficha.costo_estandar_total) if ficha.costo_estandar_total is not None else ""),
            "fechaValidacion": (ficha.fecha_validacion.isoformat() if ficha.fecha_validacion is not None else ""),
            "notas": ficha.notas or "",
        }
        for ficha in fichas
    ]


def grupos_calibracion(sesion: Session) -> list[dict]:
    """Espejo de `listarGruposCalibracion` en `final-run-data.ts` (E, #64):
    cada grupo con sus ejecuciones (una por `FinalRun`, ordenadas), y si ya
    tiene una Ficha de Parámetro vigente."""
    grupos = sesion.scalars(select(GrupoCalibracion).order_by(GrupoCalibracion.id))
    resultado = []
    for grupo in grupos:
        ejecuciones = []
        repeticiones = 5
        for final_run in sorted(grupo.final_runs, key=lambda f: f.ejecucion):
            registro = final_run.registros[0] if final_run.registros else None
            if registro is None:
                continue
            repeticiones = final_run.repeticiones
            ejecuciones.append(
                {
                    "ejecucion": final_run.ejecucion,
                    "corridaId": registro.corrida_id,
                    "calibrada": (
                        registro.kwh_corrida_medido is not None and registro.tiempo_real_corrida_s is not None
                    ),
                }
            )
        ficha = obtener_ficha_vigente(sesion, grupo)
        resultado.append(
            {
                "grupoId": grupo.grupo_calibracion_id,
                "material": grupo.material.nombre,
                "espesorMm": str(grupo.espesor_mm),
                "operacion": grupo.operacion.value,
                "velocidadMmMin": str(grupo.velocidad_mm_min),
                "potenciaPct": str(grupo.potencia_pct),
                "repeticiones": repeticiones,
                "ejecuciones": ejecuciones,
                "fichaEstado": ficha.estado.value if ficha is not None else None,
            }
        )
    return resultado


def resumen_calibracion(sesion: Session, grupo_calibracion_id: str, minimo_ejecuciones: int = 3) -> dict:
    """Espejo de `resumirCalibracion` en `final-run-data.ts` -- reusa
    `resumen_calibracion_de_grupo` (mismo motor estadístico de siempre,
    `laser_toolkit.calibracion`) en vez de correr `summarize-final-run`
    como subproceso. Levanta `ValueError` (grupo inexistente o alguna
    ejecución sin medir) -- `main.py` lo traduce a HTTP."""
    grupo = sesion.scalar(select(GrupoCalibracion).where(GrupoCalibracion.grupo_calibracion_id == grupo_calibracion_id))
    if grupo is None:
        raise ValueError(f"No existe el grupo de calibración {grupo_calibracion_id}.")
    resumen = resumen_calibracion_de_grupo(sesion, grupo, minimo_ejecuciones=minimo_ejecuciones)
    return {
        "nEjecuciones": resumen.n_ejecuciones,
        "kwhPorUnidadMedio": resumen.kwh_por_unidad_medio,
        "kwhPorUnidadDesvStd": resumen.kwh_por_unidad_desv_std,
        "kwhPorUnidadCvPct": resumen.kwh_por_unidad_cv_pct,
        "tiempoPorUnidadMedio": resumen.tiempo_por_unidad_s_medio,
        "tiempoPorUnidadDesvStd": resumen.tiempo_por_unidad_s_desv_std,
        "tiempoPorUnidadCvPct": resumen.tiempo_por_unidad_s_cv_pct,
        "calibrado": resumen.calibrado,
    }


def dashboard_resumen(sesion: Session) -> dict:
    """Espejo de `getDashboardSummary` en `fs-data.ts`. La distinción
    "generadas vs preparadas" no existe más -- una suite creada (#56) ya
    persiste su Registro completo desde el principio (ver el hallazgo del
    plan reordenado de #2), así que se cuenta cuántas ya tienen la medición
    de corrida completa en vez de eso."""
    total_suites = sesion.scalar(select(func.count()).select_from(Suite)) or 0
    total_grupos = sesion.scalar(select(func.count()).select_from(GrupoCalibracion)) or 0
    total_registros = sesion.scalar(select(func.count()).select_from(Registro)) or 0
    registros_completados = (
        sesion.scalar(
            select(func.count()).select_from(Registro).where(Registro.kwh_corrida_medido.is_not(None))
        )
        or 0
    )
    fichas_oficiales = (
        sesion.scalar(
            select(func.count())
            .select_from(FichaParametro)
            .where(FichaParametro.estado == EstadoFicha.OFICIAL)
        )
        or 0
    )
    return {
        "suitesBarrido": total_suites,
        "suitesFinalRun": total_grupos,
        "registros": total_registros,
        "registrosCompletados": registros_completados,
        "fichasOficiales": fichas_oficiales,
        "tarifasConfiguradas": obtener_tarifas_vigentes(sesion) is not None,
    }


__all__ = [
    "candidatos_final_run",
    "configuracion_maquina",
    "costeo_detalle",
    "dashboard_resumen",
    "fichas_parametro",
    "grupos_calibracion",
    "materiales_catalogo",
    "panorama_familias",
    "registro_detalle",
    "registros",
    "resumen_calibracion",
    "suite_detalle",
    "suites",
    "tarifas_vigentes",
]
