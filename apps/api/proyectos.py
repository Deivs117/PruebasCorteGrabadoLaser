"""Proyectos de diseño reutilizables del Editor (#18, sub-issue de #3):
guardar/listar/reabrir el estado exacto del lienzo (objetos, transformación,
canal/parámetros, ficha aplicada) sin resubir la imagen ni reconfigurar todo
de nuevo.

Sin dependencia de FastAPI a propósito (mismo patrón que `lectura.py`/
`escritura.py`/`storage_endpoints.py`): funciones que levantan `ValueError`
en errores de negocio, `main.py` las traduce a HTTP.

Los objetos se guardan tal como los manda el cliente (`ObjetoLienzo` en
`editor-tipos.ts`, camelCase) salvo que `contenidoSvg`/`dataUri` (el
contenido real del SVG/imagen) se reemplazan por una key del bucket
`proyectos` de Storage (issue #25) -- nunca se duplica ese contenido en la
fila de Postgres. `detalle()` hace el camino inverso: descarga el contenido
real y lo vuelve a inyectar, para que reabrir un proyecto reconstruya el
lienzo exactamente como se guardó.
"""

from __future__ import annotations

import base64
import mimetypes

from laser_toolkit.db.models import FamiliaMaterial, ProyectoDiseno
from laser_toolkit.db.repo_materiales import obtener_o_crear_material
from laser_toolkit.db.repo_proyectos import (
    actualizar_proyecto,
    crear_proyecto,
    eliminar_proyecto,
    listar_proyectos,
    obtener_proyecto,
    registrar_exportacion,
)
from laser_toolkit.storage.operaciones import (
    BUCKET_GCODE,
    BUCKET_PROYECTOS,
    descargar,
    eliminar_assets_proyecto,
    eliminar_carpeta_proyecto,
    subir_asset_proyecto,
    url_firmada,
)
from sqlalchemy.orm import Session
from supabase import Client


def _decodificar_data_uri(data_uri: str) -> tuple[bytes, str, str]:
    """`data:image/png;base64,AAAA...` -> (bytes, content_type, extensión sin
    punto). Espejo de `editor._decodificar_data_uri`, pero devuelve también
    el content-type/extensión: acá hace falta reconstruir el data URI
    completo más adelante (`_data_uri_desde`), no solo los bytes crudos."""
    if not data_uri.startswith("data:") or ";base64," not in data_uri:
        raise ValueError("La imagen del objeto raster no vino como data URI base64 válido.")
    header, b64 = data_uri.split(";base64,", 1)
    content_type = header[len("data:") :] or "application/octet-stream"
    extension = (mimetypes.guess_extension(content_type) or ".bin").lstrip(".")
    return base64.b64decode(b64), content_type, extension


def _data_uri_desde(contenido: bytes, content_type: str) -> str:
    return f"data:{content_type};base64,{base64.b64encode(contenido).decode('ascii')}"


def _obtener_o_404(sesion: Session, proyecto_id: int) -> ProyectoDiseno:
    proyecto = obtener_proyecto(sesion, proyecto_id)
    if proyecto is None:
        raise ValueError(f"No existe el proyecto de diseño {proyecto_id}.")
    return proyecto


def _resumen(proyecto: ProyectoDiseno) -> dict:
    return {
        "id": proyecto.id,
        "nombre": proyecto.nombre,
        "materialId": proyecto.material_id,
        "material": proyecto.material.nombre if proyecto.material else None,
        "fichaParametroId": proyecto.ficha_parametro_id,
        "cantidadObjetos": len(proyecto.objetos),
        "createdAt": proyecto.created_at.isoformat(),
        "updatedAt": proyecto.updated_at.isoformat(),
    }


def listar(sesion: Session) -> list[dict]:
    return [_resumen(p) for p in listar_proyectos(sesion)]


# Defaults de `PreprocesamientoRaster` (`raster-preprocesamiento.ts`) /
# `ConfiguracionRaster` (issue #15) -- un objeto raster guardado ANTES de
# #109 no tiene estos campos en absoluto; `ObjetoLienzo` en el cliente
# (`editor-tipos.ts`) espera `preprocesamiento` siempre presente, así que se
# completan acá al reconstruir el objeto, igual que ya hace `espejadoH`/
# `espejadoV` (#107) en `ObjetoProyectoBody` del lado de Pydantic.
_DEFAULTS_PREPROCESAMIENTO_RASTER = {
    "canal": "luminancia",
    "pesoRojo": 1 / 3,
    "pesoVerde": 1 / 3,
    "pesoAzul": 1 / 3,
    "gamma": 1.0,
    "invertir": False,
    "nivelesPosterizado": None,
}

# Issue #179: un objeto guardado ANTES de esta columna no tiene `visible` en
# absoluto -- `ObjetoLienzo` en el cliente lo espera siempre presente
# (booleano, no opcional), así que se completa acá igual que
# `_DEFAULTS_PREPROCESAMIENTO_RASTER` arriba. `grupoId` sí es opcional en el
# cliente (`grupoId?: string`), no necesita default.
_DEFAULTS_OBJETO_LIENZO = {
    "visible": True,
}


def _objeto_con_contenido(cliente: Client, objeto: dict) -> dict:
    """Descarga el asset de Storage de un objeto guardado y lo vuelve a
    inyectar como `contenidoSvg`/`dataUri` -- la forma que espera
    `ObjetoLienzo` en el cliente."""
    objeto = {**_DEFAULTS_OBJETO_LIENZO, **objeto}
    if objeto["tipo"] == "svg":
        key = objeto.pop("svgStorageKey", None)
        objeto["contenidoSvg"] = descargar(cliente, BUCKET_PROYECTOS, key).decode("utf-8") if key else ""
    else:
        key = objeto.pop("imagenStorageKey", None)
        content_type = objeto.pop("imagenContentType", "application/octet-stream")
        objeto["dataUri"] = _data_uri_desde(descargar(cliente, BUCKET_PROYECTOS, key), content_type) if key else ""
        objeto = {**_DEFAULTS_PREPROCESAMIENTO_RASTER, **objeto}
    return objeto


def detalle(sesion: Session, cliente: Client, proyecto_id: int) -> dict:
    proyecto = _obtener_o_404(sesion, proyecto_id)
    return {
        **_resumen(proyecto),
        "objetos": [_objeto_con_contenido(cliente, o) for o in proyecto.objetos],
        "exportaciones": [
            {
                "gcodeStorageKey": e.gcode_storage_key,
                "url": url_firmada(cliente, BUCKET_GCODE, e.gcode_storage_key),
                "exportadoEn": e.exportado_en.isoformat(),
            }
            for e in proyecto.exportaciones
        ],
    }


def _objeto_para_guardar(cliente: Client, proyecto_id: int, objeto: dict) -> dict:
    """Sube el SVG/imagen propio del objeto a Storage y devuelve la forma a
    persistir (con la key en vez del contenido real)."""
    objeto = dict(objeto)
    if objeto["tipo"] == "svg":
        contenido_svg = objeto.pop("contenidoSvg", None)
        if not contenido_svg:
            raise ValueError(f"El objeto '{objeto.get('nombre', objeto.get('id'))}' no trae contenido SVG.")
        key = subir_asset_proyecto(
            cliente, proyecto_id, objeto["id"], contenido_svg.encode("utf-8"), "image/svg+xml", "svg"
        )
        objeto["svgStorageKey"] = key
    else:
        data_uri = objeto.pop("dataUri", None)
        if not data_uri:
            raise ValueError(f"El objeto '{objeto.get('nombre', objeto.get('id'))}' no trae imagen.")
        contenido, content_type, extension = _decodificar_data_uri(data_uri)
        key = subir_asset_proyecto(cliente, proyecto_id, objeto["id"], contenido, content_type, extension)
        objeto["imagenStorageKey"] = key
        objeto["imagenContentType"] = content_type
    return objeto


def crear(sesion: Session, cliente: Client, payload: dict) -> dict:
    nombre = payload.get("nombre")
    objetos = payload.get("objetos")
    if not nombre or not str(nombre).strip():
        raise ValueError("El proyecto necesita un nombre.")
    if not objetos:
        raise ValueError("El proyecto necesita al menos un objeto.")

    material_id = _resolver_material_id(sesion, payload)

    # Se necesita el id del proyecto para nombrar las keys de Storage
    # (`ruta_asset_proyecto`) -- se crea primero con `objetos=[]` y se
    # actualiza en la misma transacción una vez subidos los assets, en vez de
    # inventar un id temporal.
    proyecto = crear_proyecto(
        sesion,
        nombre=str(nombre).strip(),
        objetos=[],
        material_id=material_id,
        ficha_parametro_id=payload.get("fichaParametroId"),
    )
    objetos_a_guardar = [_objeto_para_guardar(cliente, proyecto.id, o) for o in objetos]
    proyecto.objetos = objetos_a_guardar
    sesion.flush()
    sesion.commit()
    return _resumen(proyecto)


def actualizar(sesion: Session, cliente: Client, proyecto_id: int, payload: dict) -> dict:
    proyecto = _obtener_o_404(sesion, proyecto_id)
    nombre = payload.get("nombre")
    objetos = payload.get("objetos")
    if not nombre or not str(nombre).strip():
        raise ValueError("El proyecto necesita un nombre.")
    if not objetos:
        raise ValueError("El proyecto necesita al menos un objeto.")

    material_id = _resolver_material_id(sesion, payload)

    # `subir_asset_proyecto` sube con upsert=true (mismo id de objeto ->
    # misma key, se pisa) -- las keys de objetos que ya no están en el
    # lienzo (se borraron, o cambiaron de id) quedan huérfanas y se limpian
    # recién DESPUÉS de confirmar el commit, nunca antes: si algo falla en el
    # medio, el proyecto se queda con sus assets viejos intactos en vez de
    # perderlos (mismo criterio que `creacion.actualizar` con el .gcode).
    keys_anteriores = {_key_de(o) for o in proyecto.objetos if _key_de(o)}
    objetos_a_guardar = [_objeto_para_guardar(cliente, proyecto_id, o) for o in objetos]
    keys_nuevas = {_key_de(o) for o in objetos_a_guardar if _key_de(o)}

    actualizar_proyecto(
        sesion,
        proyecto,
        nombre=str(nombre).strip(),
        objetos=objetos_a_guardar,
        material_id=material_id,
        ficha_parametro_id=payload.get("fichaParametroId"),
    )
    sesion.commit()

    keys_huerfanas = keys_anteriores - keys_nuevas
    if keys_huerfanas:
        eliminar_assets_proyecto(cliente, keys_huerfanas)

    return _resumen(proyecto)


def _key_de(objeto: dict) -> str | None:
    return objeto.get("svgStorageKey") or objeto.get("imagenStorageKey")


def _resolver_material_id(sesion: Session, payload: dict) -> int | None:
    material_nombre = payload.get("materialNombre")
    if not material_nombre:
        return None
    familia_str = payload.get("materialFamilia") or FamiliaMaterial.OTRO.value
    familia = FamiliaMaterial(familia_str)
    material = obtener_o_crear_material(sesion, material_nombre, familia)
    return material.id


def eliminar(sesion: Session, cliente: Client, proyecto_id: int) -> None:
    proyecto = _obtener_o_404(sesion, proyecto_id)
    eliminar_proyecto(sesion, proyecto)
    sesion.commit()
    # Storage se limpia recién después de confirmar el borrado en la base --
    # si el commit fallara, el proyecto seguiría existiendo con sus assets
    # intactos en vez de quedar con las keys colgando de un registro vivo.
    eliminar_carpeta_proyecto(cliente, proyecto_id)


def registrar_exportacion_de_proyecto(sesion: Session, proyecto_id: int, gcode_storage_key: str) -> None:
    """Agrega una fila al historial de exportaciones -- llamado desde
    `editor.exportar_gcode_combinado` cuando la exportación se pidió sobre un
    proyecto ya guardado (`proyectoId` en el body)."""
    proyecto = _obtener_o_404(sesion, proyecto_id)
    registrar_exportacion(sesion, proyecto, gcode_storage_key)
    sesion.commit()


__all__ = [
    "actualizar",
    "crear",
    "detalle",
    "eliminar",
    "listar",
    "registrar_exportacion_de_proyecto",
]
