"""Endpoints de LECTURA (#48): materiales, tarifas, candidatos de Final Run.

Cada función arma directamente el JSON que espera el `lib/*.ts` equivalente
de `apps/web` (mismos nombres de campo en camelCase que ya usan los
componentes), para no tener que tocar las páginas que los consumen -- solo
cambia de dónde sale el dato (Supabase en vez de `data/`/`configs/`).

"listar suites y registros" (Hoja de Registro/Historial) quedó fuera de este
módulo -- se partió a su propio sub-issue por tamaño, ver #54.
"""

from __future__ import annotations

from laser_toolkit.db.models import Material, Suite
from laser_toolkit.db.repo_materiales import listar_materiales
from laser_toolkit.db.repo_negocio import obtener_tarifas_vigentes
from laser_toolkit.db.repo_pruebas import listar_candidatos
from sqlalchemy import select
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
        select(Material.nombre, Suite.espesor_mm)
        .join(Suite, Suite.material_id == Material.id)
        .distinct()
    ).all()
    # Nota: los precios reales viven en `precios_material` (issue #22), no en
    # `tarifas_historial` -- por ahora se listan los pares material/espesor
    # que ya tienen suites (para que el formulario tenga qué mostrar), sin
    # precio cargado. Cargar el precio real de `PrecioMaterial` queda para
    # cuando #49 escriba también sobre esa tabla desde este mismo formulario.
    return {
        "moneda": fila.moneda,
        "tarifaElectricaPorKwh": (
            str(fila.tarifa_electrica_por_kwh) if fila.tarifa_electrica_por_kwh is not None else ""
        ),
        "tarifaHoraMaquina": (str(fila.tarifa_hora_maquina) if fila.tarifa_hora_maquina is not None else ""),
        "preciosMaterial": [
            {"material": nombre, "espesorMm": str(espesor), "precio": ""} for nombre, espesor in precios
        ],
    }


def candidatos_final_run(sesion: Session) -> list[dict]:
    """Espejo de `listarCandidatos` en `candidatos-final-run.ts`, ordenado
    igual (más reciente primero). Solo cubre candidatos marcados sobre una
    Suite (no sobre un Final Run) -- es el único caso que existe hoy, marcar
    un candidato solo tiene sentido antes de llegar a Final Run."""
    resultado = []
    for candidato in listar_candidatos(sesion):
        medicion = candidato.medicion
        registro = medicion.registro
        suite = registro.suite
        if suite is None:
            # Candidato huérfano de un Registro sin Suite (no debería pasar
            # en el flujo normal) -- se lo salta en vez de reventar el listado.
            continue
        resultado.append(
            {
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
        )
    return resultado


__all__ = ["candidatos_final_run", "materiales_catalogo", "tarifas_vigentes"]
