"""Funciones de alto nivel sobre `materiales` (issue #24).

Este modulo (y sus hermanos `repo_*`) son la UNICA forma en que el resto del
sistema (funciones serverless de #2, futuros comandos del CLI) toca la base
de datos -- nunca se espera que quien llama escriba una query de SQLAlchemy
por su cuenta. Cada funcion recibe una `Session` ya abierta (el llamador
controla el ciclo de vida de la transaccion/commit) para que sea facil de
testear con SQLite en memoria y facil de componer con otras operaciones en
la misma transaccion.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from laser_toolkit.db.models import FamiliaMaterial, Material


def obtener_o_crear_material(sesion: Session, nombre: str, familia: FamiliaMaterial) -> Material:
    """Devuelve el material existente por nombre, o lo crea si no existe.

    Nunca actualiza la familia de un material ya existente -- eso seria una
    edicion explicita, no un efecto secundario de "obtener o crear".
    """
    existente = sesion.scalar(select(Material).where(Material.nombre == nombre))
    if existente is not None:
        return existente
    material = Material(nombre=nombre, familia=familia)
    sesion.add(material)
    sesion.flush()
    return material


def listar_materiales(sesion: Session) -> list[Material]:
    """Catalogo completo, ordenado por nombre (espejo de `leerCatalogoMateriales`
    en apps/web/src/lib/materiales-catalog.ts)."""
    return list(sesion.scalars(select(Material).order_by(Material.nombre)))
