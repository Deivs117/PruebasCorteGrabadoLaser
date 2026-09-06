"""Endpoints de LECTURA: materiales/tarifas/candidatos (#48), suites y
dashboard (A, issue #54).

Cada función arma directamente el JSON que espera el `lib/*.ts` equivalente
de `apps/web` (mismos nombres de campo en camelCase que ya usan los
componentes), para no tener que tocar las páginas que los consumen -- solo
cambia de dónde sale el dato (Supabase en vez de `data/`/`configs/`).

Hoja de Registro (C, issue #60) se agregó acá también -- Historial/Final Run
siguen fuera, son (D)/(E) del plan reordenado de #2.
"""

from __future__ import annotations

from laser_toolkit.db.models import (
    CandidatoFinalRun,
    Material,
    Medicion,
    PrecioMaterial,
    Registro,
    Suite,
)
from laser_toolkit.db.repo_materiales import listar_materiales
from laser_toolkit.db.repo_negocio import obtener_tarifas_vigentes
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


def _solo_suite(registro: Registro) -> bool:
    """Hoja de Registro/Costeo (C) solo cubre corridas de Suite (barrido) --
    Final Run (E) sigue siendo 100% archivos, no tiene fila en `registros`
    todavía."""
    return registro.suite_id is not None


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
    reordenado de #2), así que solo hay un tipo de fila acá."""
    filas = sesion.scalars(select(Registro).order_by(Registro.created_at.desc()))
    resultado = []
    for registro in filas:
        if not _solo_suite(registro):
            continue
        suite = registro.suite
        mediciones = registro.mediciones
        evaluadas = sum(1 for m in mediciones if m.corte_pasante is not None and m.carbonizacion_1a5 is not None)
        costeadas = sum(1 for m in mediciones if m.costo_total_celda is not None)
        resultado.append(
            {
                "corridaId": registro.corrida_id,
                "material": suite.material.nombre,
                "espesorMm": str(suite.espesor_mm),
                "operacion": suite.operacion.value,
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
    if registro is None or not _solo_suite(registro):
        return None
    suite = registro.suite
    return {
        "corridaId": registro.corrida_id,
        "material": suite.material.nombre,
        "espesorMm": str(suite.espesor_mm),
        "operacion": suite.operacion.value,
        "lote": registro.lote,
        "pasadas": suite.pasadas,
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
    if registro is None or not _solo_suite(registro):
        return None
    suite = registro.suite
    return {
        "corridaId": registro.corrida_id,
        "material": suite.material.nombre,
        "espesorMm": str(suite.espesor_mm),
        "operacion": suite.operacion.value,
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


def dashboard_resumen(sesion: Session) -> dict:
    """Espejo de `getDashboardSummary` en `fs-data.ts`. La distinción
    "generadas vs preparadas" no existe más -- una suite creada (#56) ya
    persiste su Registro completo desde el principio (ver el hallazgo del
    plan reordenado de #2), así que se cuenta cuántas ya tienen la medición
    de corrida completa en vez de eso."""
    total_suites = sesion.scalar(select(func.count()).select_from(Suite)) or 0
    total_registros = sesion.scalar(select(func.count()).select_from(Registro)) or 0
    registros_completados = (
        sesion.scalar(
            select(func.count()).select_from(Registro).where(Registro.kwh_corrida_medido.is_not(None))
        )
        or 0
    )
    return {
        "suitesBarrido": total_suites,
        # Final Run vive en otra tabla, todavía no wireada -- (E) del plan.
        "suitesFinalRun": 0,
        "registros": total_registros,
        "registrosCompletados": registros_completados,
        "fichasOficiales": 0,
        "tarifasConfiguradas": obtener_tarifas_vigentes(sesion) is not None,
    }


__all__ = [
    "candidatos_final_run",
    "costeo_detalle",
    "dashboard_resumen",
    "materiales_catalogo",
    "registro_detalle",
    "registros",
    "suite_detalle",
    "suites",
    "tarifas_vigentes",
]
