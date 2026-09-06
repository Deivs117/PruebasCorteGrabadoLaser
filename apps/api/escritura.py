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
from laser_toolkit.db.repo_negocio import fijar_precio_material, registrar_tarifas
from laser_toolkit.db.repo_pruebas import desmarcar_candidato, marcar_candidato
from lectura import candidato_a_dict, materiales_catalogo, tarifas_vigentes
from sqlalchemy import select
from sqlalchemy.orm import Session


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


def _medicion_por_identidad(sesion: Session, corrida_id: str, id_prueba: str) -> Medicion:
    medicion = sesion.scalar(
        select(Medicion)
        .join(Registro, Medicion.registro_id == Registro.id)
        .where(Registro.corrida_id == corrida_id, Medicion.id_prueba == id_prueba)
    )
    if medicion is None:
        raise ValueError(f"No existe la medición {id_prueba} de la corrida {corrida_id}.")
    return medicion


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


def desmarcar_de_archivo(sesion: Session, archivo: str) -> None:
    """Espejo de `desmarcarCandidatosDeArchivo`: al borrar una Hoja de
    Registro entera, sus candidatos marcados quedan huérfanos."""
    corrida_id = archivo.removesuffix("_registro.csv")
    registro = sesion.scalar(select(Registro).where(Registro.corrida_id == corrida_id))
    if registro is None:
        return
    for medicion in registro.mediciones:
        if medicion.candidato is not None:
            desmarcar_candidato(sesion, medicion)
    sesion.commit()


__all__ = [
    "agregar_material",
    "desmarcar",
    "desmarcar_de_archivo",
    "guardar_tarifas",
    "marcar",
]
