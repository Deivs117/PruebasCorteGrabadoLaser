"""Exportación de G-code combinado del Editor de Diseño (#3, cierre de
#15/#16): el lienzo (#16) posiciona varios objetos (SVG y/o raster) sobre el
área de trabajo real de la máquina; esta función los convierte a un único
G-code, reordenando los bloques por TIPO de operación (todo el corte junto,
todo el grabado junto -- issue #195) en vez de mantener el orden de objetos
del lienzo, para que el eje Z suba/baje como mucho una vez por exportación.
Nunca se devuelve inline (límite ~4.5MB de Vercel, decisión de #2/#3): se
sube a Storage y se devuelve un link de descarga firmado, mismo patrón que
`generacion.generar`. Si la exportación viene de un proyecto de diseño
guardado (issue #18), la key también se registra en su historial de
exportaciones.
"""

from __future__ import annotations

import base64
import math
import uuid

import proyectos
from laser_toolkit.config import MachineConfig, Operacion
from laser_toolkit.db.repo_negocio import construir_machine_config
from laser_toolkit.gcode.estimar_tiempo import estimar_duracion_s
from laser_toolkit.gcode.writer import combinar_bloques_por_operacion, encabezado, pie
from laser_toolkit.raster.api import (
    UMBRAL_DISTANCIA_FONDO_POR_DEFECTO,
    calcular_centroide_imagen,
    calcular_contorno_imagen_con_margen,
    generar_gcode_corte_y_grabado,
)
from laser_toolkit.raster.config import ConfiguracionRaster
from laser_toolkit.raster.contorno import FormaMarco, generar_marco
from laser_toolkit.storage.operaciones import BUCKET_GCODE, subir_gcode, url_firmada
from laser_toolkit.svg.api import (
    calcular_centroide_svg_texto,
    convertir_svg_texto_a_gcode,
)
from laser_toolkit.svg.geometry import Punto, Subpath
from laser_toolkit.svg.transform import rotar_punto
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


def _gcode_de_objeto_por_operacion(objeto: dict, machine: MachineConfig) -> list[tuple[Operacion, list[str]]]:
    """Igual que armar el G-code de `objeto`, pero separado por tipo de
    operacion (`Operacion.CORTE`/`Operacion.GRABADO`) en vez de una lista
    plana -- para que `exportar_gcode_combinado` pueda agrupar TODO el corte
    y TODO el grabado de TODOS los objetos del lienzo antes de emitir, y
    mover el eje Z (issue #195) una sola vez por exportacion, no una vez por
    objeto."""
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
        bloques: list[tuple[Operacion, list[str]]] = []
        for operacion in operaciones:
            params = parametros[operacion]
            gcode = convertir_svg_texto_a_gcode(
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
                # `pasadas` solo tiene efecto sobre el contorno (corte) --
                # `convertir_svg_texto_a_gcode` lo ignora en modo "relleno".
                # Default 1 si el objeto (persistido antes de esta feature)
                # no trae el campo todavia, o lo trae en `None` explicito
                # (`ParametrosOperacionBody.pasadas` es opcional).
                pasadas=params.get("pasadas") or 1,
            )
            bloques.append((Operacion(operacion), gcode))
        return bloques

    datos = _decodificar_data_uri(objeto["dataUri"])
    grabado = parametros["grabado"] if "grabado" in operaciones else None
    corte = parametros["corte"] if "corte" in operaciones else None
    grabado_potencia_baja_pct, grabado_potencia_alta_pct = _rango_potencia_grabado(grabado)
    raster_config = _configuracion_raster_de_objeto(objeto)

    bloques = []
    if grabado is not None:
        gcode_grabado = generar_gcode_corte_y_grabado(
            datos,
            ancho_mm,
            alto_mm,
            machine,
            grabado_velocidad_mm_min=grabado["velocidadMmMin"],
            grabado_potencia_baja_pct=grabado_potencia_baja_pct,
            grabado_potencia_alta_pct=grabado_potencia_alta_pct,
            grabado_config=raster_config,
            x_offset_mm=x_offset_mm,
            y_offset_mm=y_offset_mm,
            angulo_rad=angulo_rad,
        )
        bloques.append((Operacion.GRABADO, gcode_grabado))
    if corte is not None:
        gcode_corte = generar_gcode_corte_y_grabado(
            datos,
            ancho_mm,
            alto_mm,
            machine,
            corte_velocidad_mm_min=corte["velocidadMmMin"],
            corte_potencia_pct=corte["potenciaPct"],
            x_offset_mm=x_offset_mm,
            y_offset_mm=y_offset_mm,
            angulo_rad=angulo_rad,
        )
        bloques.append((Operacion.CORTE, gcode_corte))
    return bloques


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

    Los bloques de todos los objetos se reordenan por TIPO de operación
    (issue #195) antes de emitir -- todo el grabado junto, todo el corte
    junto, en vez del orden de objetos del lienzo -- para que el eje Z suba
    y baje como mucho una vez en toda la exportación, ver
    `laser_toolkit.gcode.writer.combinar_bloques_por_operacion`.
    """
    if not objetos:
        raise ValueError("El lienzo no tiene ningún objeto para exportar.")

    machine = construir_machine_config(sesion)
    bloques: list[tuple[Operacion, list[str]]] = []
    for objeto in objetos:
        bloques += _gcode_de_objeto_por_operacion(objeto, machine)

    cuerpo = combinar_bloques_por_operacion(bloques, machine) + pie()
    duracion_estimada_s = estimar_duracion_s(cuerpo, machine)
    gcode = encabezado("Editor de Diseño (#3) -- exportación combinada", duracion_estimada_s) + cuerpo

    contenido = ("\n".join(gcode) + "\n").encode("utf-8")
    corrida_id = f"editor-{uuid.uuid4().hex[:12]}"
    key = subir_gcode(cliente_storage, "editor", corrida_id, contenido)
    url = url_firmada(cliente_storage, BUCKET_GCODE, key)

    if proyecto_id is not None:
        proyectos.registrar_exportacion_de_proyecto(sesion, proyecto_id, key)

    return {"ok": True, "gcodeStorageKey": key, "url": url, "duracionEstimadaS": round(duracion_estimada_s)}


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


def calcular_marco_corte(
    tipo: str,
    ancho_mm: float,
    alto_mm: float,
    rotacion_deg: float,
    forma: FormaMarco,
    tamano_mm: float,
    *,
    contenido_svg: str | None = None,
    data_uri: str | None = None,
    umbral_distancia_fondo: float = UMBRAL_DISTANCIA_FONDO_POR_DEFECTO,
) -> dict:
    """Issue #196: marco de corte simple (circulo/cuadrado) centrado en el
    centro de masa REAL del diseño -- alternativa a `calcular_contorno_corte`
    (#108, silueta/bounding box) cuando el pedido es una forma prolija (ej.
    una pieza circular de MDF con un logo grabado adentro).

    El centro de masa se calcula en el espacio LOCAL del objeto (caja
    `ancho_mm x alto_mm`, sin rotar -- `svg.api.calcular_centroide_svg_texto`
    para `tipo="svg"`, `raster.api.calcular_centroide_imagen` para
    `tipo="raster"`), igual que el resto de la geometria local del editor.
    El marco en si nace centrado en su propia caja `tamano_mm x tamano_mm`
    (`generar_marco`, siempre centrado por construccion) y se serializa como
    SVG independiente, listo para agregarse como objeto nuevo del lienzo.

    Como el marco es un objeto NUEVO y separado (no una geometria interna
    del objeto de origen), el `xMm`/`yMm` donde va a caer en el lienzo no lo
    resuelve esta funcion -- devuelve `dxMm`/`dyMm`, el desplazamiento desde
    el CENTRO del objeto de origen hasta el centroide real, ya rotado por
    `rotacion_deg` (misma convencion de sentido/eje que
    `_angulo_rad_desde_lienzo`, así el desplazamiento sigue siendo correcto
    aunque el objeto de origen este rotado en el lienzo). Quien llama
    (`editor-lienzo.tsx`) solo necesita sumar `dxMm`/`dyMm` a `xMm`/`yMm` del
    objeto de origen para ubicar el nuevo objeto -- mismo mecanismo de
    vinculo `grupoId`/`objetoOrigenId` que ya usa #108, sin reinventarlo."""
    if tipo == "svg":
        if not contenido_svg:
            raise ValueError("Falta 'contenidoSvg' para generar el marco de un objeto SVG.")
        centro_local = calcular_centroide_svg_texto(contenido_svg, ancho_mm, alto_mm)
    elif tipo == "raster":
        if not data_uri:
            raise ValueError("Falta 'dataUri' para generar el marco de un objeto raster.")
        datos = _decodificar_data_uri(data_uri)
        centro_local = calcular_centroide_imagen(datos, ancho_mm, alto_mm, umbral_distancia_fondo)
    else:
        raise ValueError(f"Tipo de objeto no soportado para generar un marco de corte: {tipo!r}.")

    marco_local = generar_marco((tamano_mm / 2, tamano_mm / 2), forma, tamano_mm)
    contenido_svg_marco = _svg_desde_subpaths([marco_local], tamano_mm, tamano_mm)

    offset_local: Punto = (centro_local[0] - ancho_mm / 2, centro_local[1] - alto_mm / 2)
    angulo_rad = _angulo_rad_desde_lienzo(rotacion_deg)
    dx_mm, dy_mm = rotar_punto(offset_local, (0.0, 0.0), angulo_rad)

    return {
        "contenidoSvg": contenido_svg_marco,
        "tamanoMm": tamano_mm,
        "dxMm": dx_mm,
        "dyMm": dy_mm,
    }


__all__ = ["calcular_contorno_corte", "calcular_marco_corte", "exportar_gcode_combinado"]
