"""Exportación de G-code combinado del Editor de Diseño (#3, cierre de
#15/#16): el lienzo (#16) posiciona varios objetos (SVG y/o raster) sobre el
área de trabajo real de la máquina; esta función los convierte, en el orden
en que llegan, a un único G-code -- sin persistencia todavía (#18 no existe,
la exportación es efímera). Nunca se devuelve inline (límite ~4.5MB de
Vercel, decisión de #2/#3): se sube a Storage y se devuelve un link de
descarga firmado, mismo patrón que `generacion.generar`.
"""

from __future__ import annotations

import base64
import math
import uuid

from laser_toolkit.config import MachineConfig
from laser_toolkit.db.repo_negocio import construir_machine_config
from laser_toolkit.gcode.writer import encabezado, pie
from laser_toolkit.raster.api import generar_gcode_corte_y_grabado
from laser_toolkit.raster.config import ConfiguracionRaster
from laser_toolkit.storage.operaciones import BUCKET_GCODE, subir_gcode, url_firmada
from laser_toolkit.svg.api import convertir_svg_texto_a_gcode
from sqlalchemy.orm import Session
from supabase import Client

_MODO_SVG_POR_OPERACION = {"corte": "contorno", "grabado": "relleno"}


def _decodificar_data_uri(data_uri: str) -> bytes:
    """`data:image/png;base64,AAAA...` -> bytes crudos, tal como los produce
    `FileReader.readAsDataURL` en el navegador (ver `SubirObjetoDropzone`)."""
    if ";base64," not in data_uri:
        raise ValueError("La imagen del objeto raster no vino como data URI base64 válido.")
    _, b64 = data_uri.split(";base64,", 1)
    return base64.b64decode(b64)


def _angulo_rad_desde_lienzo(rotacion_deg: float) -> float:
    """El lienzo (#16, Konva) mide la rotación en sentido horario tal como se
    ve en pantalla, sobre un eje Y de pantalla creciente hacia ABAJO.
    `rotar_punto`/`Transformacion` (#15/#16, `laser_toolkit.svg.transform`)
    rotan en sentido antihorario matemático, sobre el eje Y de mm/GRBL
    creciente hacia ARRIBA. Invertir el eje Y invierte también el sentido
    aparente de un mismo giro físico -- por eso el signo se invierte acá, en
    el único punto de la integración donde ambas convenciones se cruzan."""
    return -math.radians(rotacion_deg)


def _gcode_de_objeto(objeto: dict, machine: MachineConfig) -> list[str]:
    ancho_mm: float = objeto["anchoMm"]
    alto_mm: float = objeto["altoMm"]
    # `xMm`/`yMm` son el CENTRO del objeto (ver `editor-tipos.ts`); los
    # generadores de G-code posicionan por la esquina inferior-izquierda de
    # su caja local `(0,0)-(ancho,alto)` antes de rotar.
    x_offset_mm = objeto["xMm"] - ancho_mm / 2
    y_offset_mm = objeto["yMm"] - alto_mm / 2
    angulo_rad = _angulo_rad_desde_lienzo(objeto.get("rotacionDeg", 0))
    operaciones: list[str] = objeto["operaciones"]
    parametros: dict[str, dict] = objeto["parametros"]

    if objeto["tipo"] == "svg":
        gcode: list[str] = []
        for operacion in operaciones:
            params = parametros[operacion]
            gcode += convertir_svg_texto_a_gcode(
                objeto["contenidoSvg"],
                ancho_mm,
                alto_mm,
                params["velocidadMmMin"],
                params["potenciaPct"],
                machine,
                modo=_MODO_SVG_POR_OPERACION[operacion],
                resolucion_relleno_mm=objeto["resolucionRellenoMm"],
                x_offset_mm=x_offset_mm,
                y_offset_mm=y_offset_mm,
                angulo_rad=angulo_rad,
            )
        return gcode

    datos = _decodificar_data_uri(objeto["dataUri"])
    grabado = parametros["grabado"] if "grabado" in operaciones else None
    corte = parametros["corte"] if "corte" in operaciones else None
    return generar_gcode_corte_y_grabado(
        datos,
        ancho_mm,
        alto_mm,
        machine,
        grabado_velocidad_mm_min=grabado["velocidadMmMin"] if grabado else None,
        grabado_potencia_max_pct=grabado["potenciaPct"] if grabado else None,
        grabado_config=ConfiguracionRaster(),
        corte_velocidad_mm_min=corte["velocidadMmMin"] if corte else None,
        corte_potencia_pct=corte["potenciaPct"] if corte else None,
        x_offset_mm=x_offset_mm,
        y_offset_mm=y_offset_mm,
        angulo_rad=angulo_rad,
    )


def exportar_gcode_combinado(sesion: Session, cliente_storage: Client, objetos: list[dict]) -> dict:
    """Espejo de `exportarGcodeCombinado` en `editor-data.ts`. Usa la
    configuración de máquina real (#11) en vez de los defaults de
    `MachineConfig`, para que el S máximo/velocidad límite de la exportación
    coincida con la máquina física de este taller."""
    if not objetos:
        raise ValueError("El lienzo no tiene ningún objeto para exportar.")

    machine = construir_machine_config(sesion)
    gcode: list[str] = list(encabezado("Editor de Diseño (#3) -- exportación combinada"))
    for objeto in objetos:
        gcode += _gcode_de_objeto(objeto, machine)
    gcode += pie()

    contenido = ("\n".join(gcode) + "\n").encode("utf-8")
    corrida_id = f"editor-{uuid.uuid4().hex[:12]}"
    key = subir_gcode(cliente_storage, "editor", corrida_id, contenido)
    url = url_firmada(cliente_storage, BUCKET_GCODE, key)
    return {"ok": True, "gcodeStorageKey": key, "url": url}


__all__ = ["exportar_gcode_combinado"]
