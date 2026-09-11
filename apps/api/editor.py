"""Exportación de G-code combinado del Editor de Diseño (#3, cierre de
#15/#16): el lienzo (#16) posiciona varios objetos (SVG y/o raster) sobre el
área de trabajo real de la máquina; esta función los convierte, en el orden
en que llegan, a un único G-code. Nunca se devuelve inline (límite ~4.5MB de
Vercel, decisión de #2/#3): se sube a Storage y se devuelve un link de
descarga firmado, mismo patrón que `generacion.generar`. Si la exportación
viene de un proyecto de diseño guardado (issue #18), la key también se
registra en su historial de exportaciones.
"""

from __future__ import annotations

import base64
import math
import uuid

import proyectos
from laser_toolkit.config import MachineConfig
from laser_toolkit.db.repo_negocio import construir_machine_config
from laser_toolkit.gcode.writer import encabezado, pie
from laser_toolkit.raster.api import calcular_contorno_imagen_con_margen, generar_gcode_corte_y_grabado
from laser_toolkit.raster.config import ConfiguracionRaster
from laser_toolkit.storage.operaciones import BUCKET_GCODE, subir_gcode, url_firmada
from laser_toolkit.svg.api import convertir_svg_texto_a_gcode
from laser_toolkit.svg.geometry import Subpath
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


def _rango_potencia_grabado(grabado: dict | None) -> tuple[int | None, int | None]:
    """Compatibilidad hacia atrás (#95): el editor todavía no tiene UI para
    elegir `potenciaBajaPct`/`potenciaAltaPct` por separado en un objeto
    raster (eso es #17, sin hacer todavía) -- hoy sigue mandando un solo
    `potenciaPct`, igual que antes de #95. Sin este fallback,
    `generar_gcode_corte_y_grabado` recibiría los dos `None` y OMITE el
    grabado en silencio (ver su guard `is not None`), una regresión real
    del grabado raster que ya funcionaba.

    `baja=0, alta=potenciaPct` reproduce EXACTO el escalado anterior a #95
    (`S = intensidad * potencia_max_pct`, con potencia_max_pct=potenciaPct):
    la interpolación lineal nueva da `S = 0 + intensidad*(potenciaPct-0)`,
    la misma fórmula. Cuando #17 agregue la UI de rango real, mandará
    `potenciaBajaPct`/`potenciaAltaPct` directo y este fallback deja de
    activarse (se prioriza siempre que estén los dos)."""
    if grabado is None:
        return None, None
    if grabado.get("potenciaBajaPct") is not None and grabado.get("potenciaAltaPct") is not None:
        return grabado["potenciaBajaPct"], grabado["potenciaAltaPct"]
    if grabado.get("potenciaPct") is not None:
        return 0, grabado["potenciaPct"]
    return None, None


def _configuracion_raster_de_objeto(objeto: dict) -> ConfiguracionRaster:
    """Arma la `ConfiguracionRaster` real a partir de los campos opcionales
    de preprocesamiento de imagen de un objeto raster (issue #109: canal,
    pesos de mezcla, gamma, invertir, niveles de posterizado -- ver
    `ObjetoExportarBody`/`ObjetoProyectoBody` en `main.py`). Un objeto
    guardado antes de #109 no trae estos campos (todos `None`) -- se
    filtran antes de construir, para que `ConfiguracionRaster()` aplique sus
    propios defaults exactamente como antes de #109 (comportamiento
    idéntico, sin regresión para proyectos viejos)."""
    campos = {
        "canal": objeto.get("canal"),
        "peso_rojo": objeto.get("pesoRojo"),
        "peso_verde": objeto.get("pesoVerde"),
        "peso_azul": objeto.get("pesoAzul"),
        "gamma": objeto.get("gamma"),
        "invertir": objeto.get("invertir"),
        "niveles_posterizado": objeto.get("nivelesPosterizado"),
    }
    return ConfiguracionRaster(**{k: v for k, v in campos.items() if v is not None})


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
    grabado_potencia_baja_pct, grabado_potencia_alta_pct = _rango_potencia_grabado(grabado)
    return generar_gcode_corte_y_grabado(
        datos,
        ancho_mm,
        alto_mm,
        machine,
        grabado_velocidad_mm_min=grabado["velocidadMmMin"] if grabado else None,
        grabado_potencia_baja_pct=grabado_potencia_baja_pct,
        grabado_potencia_alta_pct=grabado_potencia_alta_pct,
        grabado_config=_configuracion_raster_de_objeto(objeto),
        corte_velocidad_mm_min=corte["velocidadMmMin"] if corte else None,
        corte_potencia_pct=corte["potenciaPct"] if corte else None,
        x_offset_mm=x_offset_mm,
        y_offset_mm=y_offset_mm,
        angulo_rad=angulo_rad,
    )


def exportar_gcode_combinado(
    sesion: Session, cliente_storage: Client, objetos: list[dict], proyecto_id: int | None = None
) -> dict:
    """Espejo de `exportarGcodeCombinado` en `editor-data.ts`. Usa la
    configuración de máquina real (#11) en vez de los defaults de
    `MachineConfig`, para que el S máximo/velocidad límite de la exportación
    coincida con la máquina física de este taller.

    `proyecto_id` (issue #18, opcional): cuando la exportación se pide desde
    un proyecto de diseño ya guardado, esta key también queda en su
    historial de exportaciones -- ver `proyectos.registrar_exportacion_de_proyecto`.
    """
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

    if proyecto_id is not None:
        proyectos.registrar_exportacion_de_proyecto(sesion, proyecto_id, key)

    return {"ok": True, "gcodeStorageKey": key, "url": url}


def _svg_desde_subpaths(subpaths: list[Subpath], ancho_mm: float, alto_mm: float) -> str:
    """Serializa `subpaths` (convención Y-arriba de `laser_toolkit.svg`,
    ver `raster.contorno`) como un SVG con `viewBox="0 0 anchoMm altoMm"`.

    Vuelve a invertir el eje Y (Y-arriba -> Y-abajo, nativo de SVG) para que
    `cargar_subpaths_svg_texto`/`svg.transform` (que sí esperan SVG nativo y
    aplican su propio flip) reconstruyan exactamente los mismos puntos --
    ida y vuelta sin distorsión, con escala 1:1 porque el viewBox coincide
    con el tamaño real en mm.

    Issue #179: `fill="none"` + `stroke` -- sin esto, el navegador rellena
    el `<path>` cerrado sólido en NEGRO por defecto (comportamiento estándar
    de SVG, no una elección de este código), tapando por completo la
    imagen de origen que este contorno se supone que solo debía bordear.
    El grosor (`stroke-width`, en las mismas unidades del `viewBox` -- mm)
    es deliberadamente chico pero visible a los tamaños típicos de un
    objeto en el lienzo."""
    partes_d: list[str] = []
    for subpath in subpaths:
        puntos = [(x, alto_mm - y) for x, y in subpath.puntos]
        if not puntos:
            continue
        comandos = [f"M {puntos[0][0]:.4f},{puntos[0][1]:.4f}"]
        comandos += [f"L {x:.4f},{y:.4f}" for x, y in puntos[1:]]
        if subpath.cerrado:
            comandos.append("Z")
        partes_d.append(" ".join(comandos))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho_mm:.4f} {alto_mm:.4f}">'
        f'<path d="{" ".join(partes_d)}" fill="none" stroke="#246bce" stroke-width="0.3" /></svg>'
    )


def calcular_contorno_corte(data_uri: str, ancho_mm: float, alto_mm: float, margen_mm: float) -> dict:
    """Issue #108: silueta de corte automática alrededor de una imagen del
    editor (silueta alfa real, o rectángulo si la imagen no tiene
    transparencia -- ver `raster.contorno`), expandida `margen_mm` hacia
    afuera para que el corte no quede pegado al borde exacto del diseño.

    Devuelve el contorno ya serializado como SVG (`contenidoSvg`, misma
    forma que un objeto `tipo="svg"` del lienzo, ver `editor-tipos.ts`)
    junto con el ancho/alto en mm que ocupa -- crece respecto de
    `ancho_mm`/`alto_mm` según el margen, así el caller puede centrar el
    nuevo objeto exactamente sobre la imagen original."""
    datos = _decodificar_data_uri(data_uri)
    subpaths, ancho_contorno_mm, alto_contorno_mm = calcular_contorno_imagen_con_margen(
        datos, ancho_mm, alto_mm, margen_mm
    )
    contenido_svg = _svg_desde_subpaths(subpaths, ancho_contorno_mm, alto_contorno_mm)
    return {
        "contenidoSvg": contenido_svg,
        "anchoMm": ancho_contorno_mm,
        "altoMm": alto_contorno_mm,
    }


__all__ = ["calcular_contorno_corte", "exportar_gcode_combinado"]
