"""Funciones de alto nivel sobre `proyectos_diseno` (issue #18) -- guardar,
listar, reabrir y eliminar un proyecto de diseño reutilizable del Editor
(#3), más el historial de sus exportaciones a G-code.

Mismo patrón que `repo_pruebas.py`: recibe la `Session` ya abierta, nunca
crea una propia; la subida/borrado de archivos en Storage queda del lado del
llamador (`apps/api/proyectos.py`) -- este módulo nunca importa
`laser_toolkit.storage` ni depende de red.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from laser_toolkit.db.models import ProyectoDiseno, ProyectoDisenoExportacion


def crear_proyecto(
    sesion: Session,
    *,
    nombre: str,
    objetos: list[dict],
    material_id: int | None = None,
    ficha_parametro_id: int | None = None,
) -> ProyectoDiseno:
    proyecto = ProyectoDiseno(
        nombre=nombre,
        objetos=objetos,
        material_id=material_id,
        ficha_parametro_id=ficha_parametro_id,
    )
    sesion.add(proyecto)
    sesion.flush()
    return proyecto


def actualizar_proyecto(
    sesion: Session,
    proyecto: ProyectoDiseno,
    *,
    nombre: str,
    objetos: list[dict],
    material_id: int | None = None,
    ficha_parametro_id: int | None = None,
) -> ProyectoDiseno:
    """Guarda cambios sobre el mismo proyecto (mismo id) -- "Guardar cambios"
    en el Editor, en vez de acumular un proyecto nuevo por cada guardado."""
    proyecto.nombre = nombre
    proyecto.objetos = objetos
    proyecto.material_id = material_id
    proyecto.ficha_parametro_id = ficha_parametro_id
    sesion.flush()
    return proyecto


def listar_proyectos(sesion: Session) -> list[ProyectoDiseno]:
    # `id.desc()` como desempate: dos proyectos creados en el mismo instante
    # (ej. en tests, o dos guardados muy seguidos) tendrían el mismo
    # `updated_at` con la resolución de algunos backends -- sin el desempate
    # el orden entre ellos queda indefinido.
    orden = (ProyectoDiseno.updated_at.desc(), ProyectoDiseno.id.desc())
    return list(sesion.scalars(select(ProyectoDiseno).order_by(*orden)))


def obtener_proyecto(sesion: Session, proyecto_id: int) -> ProyectoDiseno | None:
    return sesion.get(ProyectoDiseno, proyecto_id)


def eliminar_proyecto(sesion: Session, proyecto: ProyectoDiseno) -> None:
    """Borra el proyecto y en cascada su historial de exportaciones (ver
    `cascade="all, delete-orphan"` en `ProyectoDiseno.exportaciones`) -- los
    archivos de Storage asociados los borra el llamador antes de esto."""
    sesion.delete(proyecto)
    sesion.flush()


def registrar_exportacion(
    sesion: Session, proyecto: ProyectoDiseno, gcode_storage_key: str
) -> ProyectoDisenoExportacion:
    """Agrega una fila al historial de exportaciones de un proyecto -- se
    llama cada vez que se exporta un G-code combinado desde un proyecto ya
    guardado (nunca se pisa una exportación anterior)."""
    exportacion = ProyectoDisenoExportacion(proyecto_id=proyecto.id, gcode_storage_key=gcode_storage_key)
    sesion.add(exportacion)
    sesion.flush()
    return exportacion


__all__ = [
    "actualizar_proyecto",
    "crear_proyecto",
    "eliminar_proyecto",
    "listar_proyectos",
    "obtener_proyecto",
    "registrar_exportacion",
]
