"""Endpoints de ESCRITURA (#49) -- solo la parte que no depende de #50
(generación de G-code/SVG): catálogo de materiales, tarifas y candidatos de
Final Run. "Crear suite" y todo lo que genera G-code real se separó a #56,
porque generarlo de verdad requiere primero resolver #50 (`execFile("uv",
...)` no sobrevive en Vercel, ver el hallazgo documentado en #47).

Sin dependencia de FastAPI a propósito (igual que `lectura.py`): las
funciones de acá levantan `ValueError` en los casos de error de negocio
(material desconocido, identidad de candidato inexistente) y es `main.py`
quien las traduce a códigos HTTP -- así este módulo se puede probar llamando
las funciones directo, sin levantar un servidor.
"""

from __future__ import annotations

from laser_toolkit.db.models import FamiliaMaterial, Material, Medicion, Registro
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.db.repo_negocio import (
    actualizar_configuracion_maquina,
    construir_machine_config,
    construir_tarifas_config,
    fijar_precio_material,
    obtener_tarifas_vigentes,
    registrar_tarifas,
)
from laser_toolkit.db.repo_pruebas import (
    calcular_y_guardar_costos_registro,
    completar_evaluacion,
    completar_medicion_corrida,
    desmarcar_candidato,
    marcar_candidato,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from lectura import (
    candidato_a_dict,
    configuracion_maquina,
    costeo_detalle,
    materiales_catalogo,
    registro_detalle,
    tarifas_vigentes,
)


def agregar_material(sesion: Session, nombre: str, familia: str) -> list[dict]:
    """Espejo de `agregarMaterialCatalogo` en `materiales-catalog.ts`: agrega
    (u obtiene, si ya existe) el material y devuelve el catálogo completo
    actualizado -- así el frontend no necesita hacer un segundo round-trip
    para refrescar la lista."""
    limpio = nombre.strip()
    if limpio == "":
        raise ValueError("El nombre del material no puede estar vacío.")
    if len(limpio) > 60:
        raise ValueError("El nombre del material es demasiado largo.")
    try:
        familia_enum = FamiliaMaterial(familia)
    except ValueError as error:
        raise ValueError("Elegí una familia de material válida.") from error

    obtener_o_crear_material(sesion, limpio, familia_enum)
    sesion.commit()
    return materiales_catalogo(sesion)


def guardar_tarifas(
    sesion: Session,
    *,
    moneda: str,
    tarifa_electrica_por_kwh: float | None,
    tarifa_hora_maquina: float | None,
    precios_material: list[dict],
) -> dict:
    """Espejo de `guardarTarifas` en `tarifas-data.ts`. `precios_material` es
    la lista `[{material, espesorMm, precio}]` tal cual la manda el
    formulario -- el material ya tiene que existir en el catálogo (se creó al
    agregar la suite o vía `agregar_material`); si no existe, se lo salta en
    vez de crear un material fantasma solo porque alguien le puso precio."""
    registrar_tarifas(
        sesion,
        moneda=moneda,
        tarifa_electrica_por_kwh=tarifa_electrica_por_kwh,
        tarifa_hora_maquina=tarifa_hora_maquina,
    )
    for item in precios_material:
        material = sesion.scalar(select(Material).where(Material.nombre == item["material"]))
        if material is None:
            continue
        precio = item.get("precio")
        fijar_precio_material(
            sesion,
            material,
            float(item["espesorMm"]),
            float(precio) if precio not in (None, "") else None,
        )
    sesion.commit()
    return tarifas_vigentes(sesion)


def guardar_configuracion_maquina(
    sesion: Session,
    *,
    laser_max_s: int,
    travel_feed_mm_min: int,
    potencia_modulo_w: float,
    factor_utilizacion_laser: float,
    punto_focal_mm: float,
    velocidad_max_mm_min: int,
    aceleracion_mm_s2: float,
    area_trabajo_ancho_mm: float,
    area_trabajo_alto_mm: float,
) -> dict:
    """Espejo de `guardarMaquina` en `maquina-data.ts`. A diferencia de
    tarifas, esto pasa a ser el default global real de toda la máquina
    (issue #11) -- sobreescribe la fila única en vez de agregar un
    historial."""
    actualizar_configuracion_maquina(
        sesion,
        laser_max_s=laser_max_s,
        travel_feed_mm_min=travel_feed_mm_min,
        potencia_modulo_w=potencia_modulo_w,
        factor_utilizacion_laser=factor_utilizacion_laser,
        punto_focal_mm=punto_focal_mm,
        velocidad_max_mm_min=velocidad_max_mm_min,
        aceleracion_mm_s2=aceleracion_mm_s2,
        area_trabajo_ancho_mm=area_trabajo_ancho_mm,
        area_trabajo_alto_mm=area_trabajo_alto_mm,
    )
    sesion.commit()
    return configuracion_maquina(sesion)


def _medicion_por_identidad(sesion: Session, corrida_id: str, id_prueba: str) -> Medicion:
    medicion = sesion.scalar(
        select(Medicion)
        .join(Registro, Medicion.registro_id == Registro.id)
        .where(Registro.corrida_id == corrida_id, Medicion.id_prueba == id_prueba)
    )
    if medicion is None:
        raise ValueError(f"No existe la medición {id_prueba} de la corrida {corrida_id}.")
    return medicion


def _registro_por_corrida(sesion: Session, corrida_id: str) -> Registro:
    registro = sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id))
    if registro is None:
        raise ValueError(f"No existe la corrida {corrida_id}.")
    return registro


def completar_registro(
    sesion: Session,
    corrida_id: str,
    *,
    kwh_corrida_medido: float | None,
    tiempo_real_corrida_s: float | None,
    celdas: list[dict],
) -> dict:
    """Hoja de Registro (C, issue #60): guarda en una sola transacción la
    medición de la corrida completa (si se cargó) y la evaluación de cada
    celda -- un solo botón "Guardar cambios" en el frontend, igual que en el
    csv plano, aunque acá viajen a dos tablas distintas (`Registro` vs
    `Medicion`).

    A diferencia del csv, `kwh_corrida_medido`/`tiempo_real_corrida_s` no se
    validan "iguales entre filas" (`filasComparten` en el TS viejo): viven
    UNA sola vez en `Registro`, el modelo de datos ya lo garantiza."""
    registro = _registro_por_corrida(sesion, corrida_id)
    if kwh_corrida_medido is not None and tiempo_real_corrida_s is not None:
        completar_medicion_corrida(
            sesion,
            registro,
            kwh_corrida_medido=kwh_corrida_medido,
            tiempo_real_corrida_s=tiempo_real_corrida_s,
        )

    mediciones_por_id = {m.id_prueba: m for m in registro.mediciones}
    for celda in celdas:
        medicion = mediciones_por_id.get(celda["idPrueba"])
        if medicion is None:
            raise ValueError(f"La celda {celda['idPrueba']} no pertenece a la corrida {corrida_id}.")
        corte_pasante = celda.get("cortePasante")
        carbonizacion = celda.get("carbonizacion1a5")
        completar_evaluacion(
            sesion,
            medicion,
            corte_pasante=None if corte_pasante in (None, "") else corte_pasante == "si",
            carbonizacion_1a5=None if carbonizacion in (None, "") else int(carbonizacion),
            notas=celda.get("notas") or "",
        )

    sesion.commit()
    detalle = registro_detalle(sesion, corrida_id)
    if detalle is None:
        raise ValueError("El registro se guardó pero no se pudo reconstruir para la respuesta.")
    return detalle


def calcular_costos(sesion: Session, corrida_id: str) -> dict:
    """Espejo de `calcularCosteo` en `costeo-data.ts`, pero operando sobre la
    base -- reusa `calcular_y_guardar_costos_registro` (mismo motor de
    `laser_toolkit.costos` de siempre) en vez de correr el CLI."""
    if obtener_tarifas_vigentes(sesion) is None:
        raise ValueError("Todavía no se cargaron las tarifas del taller.")
    registro = _registro_por_corrida(sesion, corrida_id)
    tarifas = construir_tarifas_config(sesion)
    machine = construir_machine_config(sesion)
    calcular_y_guardar_costos_registro(sesion, registro, tarifas, machine)
    sesion.commit()
    detalle = costeo_detalle(sesion, corrida_id)
    if detalle is None:
        raise ValueError("El costeo se calculó pero no se pudo reconstruir para la respuesta.")
    return detalle


def marcar(sesion: Session, corrida_id: str, id_prueba: str) -> dict:
    """Espejo de `marcarCandidato` en `candidatos-final-run.ts` -- recibe solo
    la identidad (corridaId + idPrueba); el resto de los campos que el TS
    original guardaba a mano (material, espesorMm, ...) ya están disponibles
    por las relaciones de la fila normalizada, no hace falta duplicarlos."""
    medicion = _medicion_por_identidad(sesion, corrida_id, id_prueba)
    marcar_candidato(sesion, medicion)
    sesion.commit()
    candidato = candidato_a_dict(medicion.candidato) if medicion.candidato else None
    if candidato is None:
        raise ValueError("El candidato se marcó pero no se pudo reconstruir para la respuesta.")
    return candidato


def desmarcar(sesion: Session, corrida_id: str, id_prueba: str) -> None:
    medicion = _medicion_por_identidad(sesion, corrida_id, id_prueba)
    desmarcar_candidato(sesion, medicion)
    sesion.commit()


__all__ = [
    "agregar_material",
    "calcular_costos",
    "completar_registro",
    "desmarcar",
    "guardar_tarifas",
    "marcar",
]
