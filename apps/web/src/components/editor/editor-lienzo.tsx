"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Layer, Rect, Stage, Transformer } from "react-konva";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { iconButtonClasses } from "@/lib/button-styles";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { ObjetoLienzoKonva } from "@/components/editor/objeto-lienzo-konva";
import { LienzoGrilla } from "@/components/editor/lienzo-grilla";
import { LienzoReglas } from "@/components/editor/lienzo-reglas";
import { BarraAccionesObjeto } from "@/components/editor/barra-acciones-objeto";
import { PanelObjeto } from "@/components/editor/panel-objeto";
import { SubirObjetoDropzone } from "@/components/editor/subir-objeto-dropzone";
import { limitesDe, objetoExcedeArea } from "@/lib/editor-area";
import { colorSeleccionDe } from "@/lib/editor-colores";
import {
  MARGEN_REGLA_PX,
  ZOOM_PASO,
  limitarZoom,
  pantallaAMm,
  xMmAPantalla,
  yMmAPantalla,
  type VistaLienzo,
} from "@/lib/editor-vista";
import type { ObjetoExportar } from "@/lib/editor-export-schema";
import type { ObjetoProyecto } from "@/lib/proyecto-schema";
import { conversionSvgSchema, type ModoGrabadoSvg } from "@/lib/svg-schema";
import type {
  EstadoToolpath,
  ObjetoLienzo,
  Operacion,
} from "@/lib/editor-tipos";

/** Recorta un `ObjetoLienzo` (estado del cliente, con `id`/`nombre`/
 * `toolpath` y demás campos de UI) a la forma que espera `/api/editor/
 * exportar` -- espejo de `ObjetoExportarBody` en `apps/api/main.py`.
 * `espejadoH`/`espejadoV` (#107) quedan afuera a propósito: son un campo
 * puramente visual del cliente, el backend todavía no sabe espejar. */
function aObjetoExportar(objeto: ObjetoLienzo): ObjetoExportar {
  const comunes = {
    xMm: objeto.xMm,
    yMm: objeto.yMm,
    anchoMm: objeto.anchoMm,
    altoMm: objeto.altoMm,
    rotacionDeg: objeto.rotacionDeg,
    operaciones: objeto.operaciones,
    parametros: objeto.parametros,
  };
  return objeto.tipo === "svg"
    ? {
        tipo: "svg",
        ...comunes,
        contenidoSvg: objeto.contenidoSvg,
        resolucionRellenoMm: objeto.resolucionRellenoMm,
      }
    : { tipo: "raster", ...comunes, dataUri: objeto.dataUri };
}

/** Recorta un `ObjetoLienzo` a la forma que espera `POST`/`PUT /api/
 * proyectos` -- espejo de `ObjetoProyectoBody` en `apps/api/main.py`.
 * A diferencia de `aObjetoExportar`, acá viajan también `id`/`nombre`/
 * `mantenerProporcion`: reabrir el proyecto necesita reconstruir el lienzo
 * exacto, no solo generar G-code. */
function aObjetoProyecto(objeto: ObjetoLienzo): ObjetoProyecto {
  const comunes = {
    id: objeto.id,
    nombre: objeto.nombre,
    xMm: objeto.xMm,
    yMm: objeto.yMm,
    anchoMm: objeto.anchoMm,
    altoMm: objeto.altoMm,
    rotacionDeg: objeto.rotacionDeg,
    operaciones: objeto.operaciones,
    parametros: objeto.parametros,
    mantenerProporcion: objeto.mantenerProporcion,
    // #107 (posterior a #18): espejado horizontal/vertical -- sin esto, un
    // objeto espejado en el lienzo se guarda "derecho" y pierde el espejo
    // al reabrir el proyecto.
    espejadoH: objeto.espejadoH,
    espejadoV: objeto.espejadoV,
  };
  return objeto.tipo === "svg"
    ? {
        tipo: "svg",
        ...comunes,
        nombreArchivoSvg: objeto.nombreArchivoSvg,
        contenidoSvg: objeto.contenidoSvg,
        resolucionRellenoMm: objeto.resolucionRellenoMm,
      }
    : { tipo: "raster", ...comunes, dataUri: objeto.dataUri };
}

/** Estado del lienzo cuando se abre desde un proyecto guardado (#18, vía
 * `?proyectoId=` en `/editor`) -- pasado por `page.tsx` ya con el contenido
 * real de cada objeto reconstruido (`obtenerProyecto`). */
export interface ProyectoInicial {
  id: number;
  nombre: string;
  objetos: ObjetoLienzo[];
}

interface EditorLienzoProps {
  areaTrabajoAnchoMm: number;
  areaTrabajoAltoMm: number;
  proyectoInicial?: ProyectoInicial | null;
}

/** `corte` sigue el outline del diseño; `grabado` es el relleno detallado —
 * mismo mapeo que decidió #3 para cuando un objeto pide ambas operaciones. */
const MODO_POR_OPERACION: Record<Operacion, ModoGrabadoSvg> = {
  corte: "contorno",
  grabado: "relleno",
};

const ESPACIADO_CASCADA_MM = 15;
/** Desplazamiento (mm) del duplicado respecto del original (#107) -- lo
 * suficiente para que se note que hay dos objetos distintos sin que el
 * nuevo aparezca fuera del área de trabajo en la mayoría de los casos. */
const DESPLAZAMIENTO_DUPLICADO_MM = 10;
/** Nudge por teclado (#107): 1mm normal, 0.1mm con Shift para ajustes
 * finos -- mismo par de magnitudes que ya usa el resto del toolkit para
 * "paso fino" vs. "paso normal". */
const NUDGE_MM = 1;
const NUDGE_FINO_MM = 0.1;

/** El resto del `Transformer` de Konva vive en `handles` de las esquinas
 * únicamente (resize proporcional) más el de rotación -- nunca los del
 * medio de cada lado, que estirarían el objeto sin preservar proporción:
 * ese ajuste "libre" en un solo eje ya lo cubre el panel numérico
 * (`mantenerProporcion` desactivado), no hacía falta duplicarlo acá. */
const ANCLAS_TRANSFORMER: string[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

function elementoEsCampoDeTexto(elemento: Element | null): boolean {
  return (
    elemento instanceof HTMLInputElement ||
    elemento instanceof HTMLTextAreaElement ||
    (elemento instanceof HTMLElement && elemento.isContentEditable)
  );
}

/**
 * Lienzo interactivo de "Editor de Diseño" (#3/#16): subir, arrastrar,
 * posicionar y rotar varios objetos (SVG y/o imágenes raster) sobre el área
 * de trabajo real de la máquina, con preview de toolpath por objeto y
 * exportación final a un G-code combinado (`/api/editor/exportar`, cierre
 * de #15/#16 -- la conversión real corre en `apps/api`, reusando el motor
 * de rotación de `laser_toolkit.svg.transform`/`laser_toolkit.raster`).
 *
 * #107 le agregó la capa de precisión/interacción: zoom + pan del lienzo,
 * grilla y reglas que se afinan con el zoom, handles de resize/rotación y
 * una barra de acciones rápidas sobre el objeto seleccionado, nudge por
 * teclado y color por tipo de operación. El panel numérico (`PanelObjeto`)
 * sigue siendo la fuente de verdad "precisa" -- todo esto es el
 * complemento cómodo para ajustar a ojo, ver su docstring.
 */
export function EditorLienzo({
  areaTrabajoAnchoMm,
  areaTrabajoAltoMm,
  proyectoInicial = null,
}: EditorLienzoProps) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [objetos, setObjetos] = useState<ObjetoLienzo[]>(
    () => proyectoInicial?.objetos ?? [],
  );
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [vistaToolpath, setVistaToolpath] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [anchoContenedorPx, setAnchoContenedorPx] = useState(600);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  // "Guardar como proyecto" (#18): `proyectoId` pasa a tener valor apenas se
  // guarda por primera vez -- de ahí en más "Guardar" actualiza la misma
  // fila (PUT) en vez de crear un proyecto nuevo por cada guardado.
  const [proyectoId, setProyectoId] = useState<number | null>(
    proyectoInicial?.id ?? null,
  );
  const [nombreProyecto, setNombreProyecto] = useState(
    proyectoInicial?.nombre ?? "",
  );
  const [editandoNombre, setEditandoNombre] = useState(
    proyectoInicial === null,
  );
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(MARGEN_REGLA_PX);
  const [panY, setPanY] = useState(MARGEN_REGLA_PX);

  const nodosRef = useRef(new Map<string, Konva.Group>());
  const transformerRef = useRef<Konva.Transformer>(null);

  // Konva dibuja sobre un <canvas> real -- montarlo durante el render de
  // servidor rompería el SSR (no hay canvas ahí). No se puede derivar de un
  // valor existente durante el render, por eso el flag vive en un efecto,
  // a propósito, solo para marcar "ya estamos en el cliente".
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const observador = new ResizeObserver((entradas) => {
      const ancho = entradas[0]?.contentRect.width;
      if (ancho) setAnchoContenedorPx(ancho);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // El ancho disponible para el área de trabajo descuenta la banda fija de
  // la regla izquierda (#107) -- el `Stage` completo (regla + contenido)
  // sigue ocupando el ancho real del contenedor.
  const anchoDisponiblePx = Math.max(anchoContenedorPx - MARGEN_REGLA_PX, 50);
  const pxPorMm = anchoDisponiblePx / areaTrabajoAnchoMm;
  const anchoContenidoPx = areaTrabajoAnchoMm * pxPorMm;
  const altoContenidoPx = areaTrabajoAltoMm * pxPorMm;
  const anchoStagePx = anchoContenedorPx;
  const altoStagePx = altoContenidoPx + MARGEN_REGLA_PX;

  const vista: VistaLienzo = useMemo(
    () => ({ pxPorMm, zoom, panX, panY, areaTrabajoAltoMm }),
    [pxPorMm, zoom, panX, panY, areaTrabajoAltoMm],
  );

  const seleccionado = objetos.find((o) => o.id === seleccionadoId) ?? null;

  const objetosFueraDeArea = useMemo(
    () =>
      objetos.filter((o) =>
        objetoExcedeArea(o, areaTrabajoAnchoMm, areaTrabajoAltoMm),
      ),
    [objetos, areaTrabajoAnchoMm, areaTrabajoAltoMm],
  );

  // Engancha (o desengancha) el Transformer al nodo Konva del objeto
  // seleccionado -- el Transformer es uno solo por lienzo, compartido, y se
  // reapunta cada vez que cambia la selección.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodo = seleccionadoId ? nodosRef.current.get(seleccionadoId) : null;
    transformer.nodes(nodo ? [nodo] : []);
    transformer.getLayer()?.batchDraw();
  }, [seleccionadoId, objetos]);

  // Nudge por teclado (#107): flechas mueven el objeto seleccionado 1mm,
  // 0.1mm con Shift. Se ignora mientras el foco está en un campo de texto
  // (ej. escribiendo en el panel numérico) para no pelear con el cursor.
  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if (!seleccionadoId || elementoEsCampoDeTexto(document.activeElement)) {
        return;
      }
      const paso = evento.shiftKey ? NUDGE_FINO_MM : NUDGE_MM;
      let deltaXMm = 0;
      let deltaYMm = 0;
      switch (evento.key) {
        case "ArrowLeft":
          deltaXMm = -paso;
          break;
        case "ArrowRight":
          deltaXMm = paso;
          break;
        case "ArrowUp":
          deltaYMm = paso;
          break;
        case "ArrowDown":
          deltaYMm = -paso;
          break;
        default:
          return;
      }
      evento.preventDefault();
      actualizarObjeto(seleccionadoId, (o) => ({
        ...o,
        xMm: o.xMm + deltaXMm,
        yMm: o.yMm + deltaYMm,
      }));
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [seleccionadoId]);

  function siguientePosicion() {
    const indice = objetos.length;
    const paso = ESPACIADO_CASCADA_MM;
    return {
      xMm: areaTrabajoAnchoMm / 2 + (indice % 5) * paso - paso * 2,
      yMm: areaTrabajoAltoMm / 2 - Math.floor(indice / 5) * paso,
    };
  }

  function agregarObjeto(objeto: ObjetoLienzo) {
    setObjetos((anteriores) => [...anteriores, objeto]);
    setSeleccionadoId(objeto.id);
  }

  /** Recibe una función en vez de un objeto parcial: `ObjetoLienzo` es una
   * unión discriminada (svg/raster) y un `Partial<ObjetoLienzo>` genérico
   * solo admitiría los campos comunes a ambas variantes — la función deja
   * que cada quien narrowee al tipo concreto que necesita (ej. `toolpath`,
   * exclusivo de los objetos SVG). */
  function actualizarObjeto(
    id: string,
    actualizar: (objeto: ObjetoLienzo) => ObjetoLienzo,
  ) {
    setObjetos((anteriores) =>
      anteriores.map((o) => (o.id === id ? actualizar(o) : o)),
    );
  }

  function actualizarCampos(
    id: string,
    cambios: Omit<Partial<ObjetoLienzo>, "tipo">,
  ) {
    actualizarObjeto(id, (o) => ({ ...o, ...cambios }));
  }

  function eliminarObjeto(id: string) {
    setObjetos((anteriores) => anteriores.filter((o) => o.id !== id));
    setSeleccionadoId((actual) => (actual === id ? null : actual));
  }

  /** Clona el objeto seleccionado con un id nuevo, corrido unos mm para que
   * se note que hay dos (#107). El toolpath cacheado no se copia: quedó
   * calculado para la posición/tamaño del original y este es un objeto
   * distinto que el usuario puede terminar redimensionando aparte. */
  function duplicarObjeto(id: string) {
    const objeto = objetos.find((o) => o.id === id);
    if (!objeto) return;
    const posicion = {
      id: crypto.randomUUID(),
      xMm: objeto.xMm + DESPLAZAMIENTO_DUPLICADO_MM,
      yMm: objeto.yMm - DESPLAZAMIENTO_DUPLICADO_MM,
    };
    agregarObjeto(
      objeto.tipo === "svg"
        ? { ...objeto, ...posicion, toolpath: {} }
        : { ...objeto, ...posicion },
    );
  }

  function espejarObjeto(id: string, eje: "horizontal" | "vertical") {
    actualizarObjeto(id, (o) =>
      eje === "horizontal"
        ? { ...o, espejadoH: !o.espejadoH }
        : { ...o, espejadoV: !o.espejadoV },
    );
  }

  function fijarToolpath(
    id: string,
    operacion: Operacion,
    resultado: EstadoToolpath,
  ) {
    actualizarObjeto(id, (o) =>
      o.tipo === "svg"
        ? { ...o, toolpath: { ...o.toolpath, [operacion]: resultado } }
        : o,
    );
  }

  async function generarToolpath(id: string, operacion: Operacion) {
    const objeto = objetos.find((o) => o.id === id);
    if (!objeto || objeto.tipo !== "svg") return;

    fijarToolpath(id, operacion, { estado: "generando" });

    const datos = conversionSvgSchema.safeParse({
      anchoMm: objeto.anchoMm,
      altoMm: objeto.altoMm,
      velocidadMmMin: objeto.parametros[operacion].velocidadMmMin,
      potenciaPct: objeto.parametros[operacion].potenciaPct,
      modo: MODO_POR_OPERACION[operacion],
      resolucionRellenoMm: objeto.resolucionRellenoMm,
    });
    if (!datos.success) {
      fijarToolpath(id, operacion, {
        estado: "error",
        mensaje: datos.error.issues.map((i) => i.message).join(" "),
      });
      return;
    }

    try {
      const respuesta = await fetch(
        `/api/svgs/${encodeURIComponent(objeto.nombreArchivoSvg)}/convertir`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos.data),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        gcode?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.gcode) {
        fijarToolpath(id, operacion, { estado: "ok", gcode: cuerpo.gcode });
        setVistaToolpath(true);
      } else {
        fijarToolpath(id, operacion, {
          estado: "error",
          mensaje: cuerpo.error ?? "No se pudo generar el toolpath.",
        });
      }
    } catch {
      fijarToolpath(id, operacion, {
        estado: "error",
        mensaje: "No se pudo conectar con el taller.",
      });
    }
  }

  async function exportarGcode() {
    setExportando(true);
    setErrorExportar(null);
    try {
      const respuesta = await fetch("/api/editor/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objetos: objetos.map(aObjetoExportar),
          proyectoId,
        }),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.url) {
        window.open(cuerpo.url, "_blank");
      } else {
        setErrorExportar(cuerpo.error ?? "No se pudo exportar el G-code.");
      }
    } catch {
      setErrorExportar("No se pudo conectar con el taller.");
    } finally {
      setExportando(false);
    }
  }

  /** Zoom con la rueda del mouse (#107), manteniendo fijo el punto del
   * lienzo que está bajo el cursor -- si no se compensa el pan, cada scroll
   * "se aleja" del punto de interés en vez de acercarse a él. */
  function alHacerScroll(evento: KonvaEventObject<WheelEvent>) {
    evento.evt.preventDefault();
    const stage = evento.target.getStage();
    const puntero = stage?.getPointerPosition();
    if (!puntero) return;
    const direccion = evento.evt.deltaY > 0 ? -1 : 1;
    aplicarZoom(
      limitarZoom(direccion > 0 ? zoom * ZOOM_PASO : zoom / ZOOM_PASO),
      puntero.x,
      puntero.y,
    );
  }

  /** Centro del área visible del lienzo -- ancla usada por los botones +/-
   * de la barra de zoom (a diferencia de la rueda, que ancla en el cursor). */
  function aplicarZoom(
    zoomNuevo: number,
    ancoraXPx: number,
    ancoraYPx: number,
  ) {
    const mundo = pantallaAMm(ancoraXPx, ancoraYPx, vista);
    setZoom(zoomNuevo);
    setPanX(ancoraXPx - mundo.xMm * pxPorMm * zoomNuevo);
    setPanY(ancoraYPx - (areaTrabajoAltoMm - mundo.yMm) * pxPorMm * zoomNuevo);
  }

  function acercar() {
    aplicarZoom(
      limitarZoom(zoom * ZOOM_PASO),
      anchoStagePx / 2,
      altoStagePx / 2,
    );
  }

  function alejar() {
    aplicarZoom(
      limitarZoom(zoom / ZOOM_PASO),
      anchoStagePx / 2,
      altoStagePx / 2,
    );
  }

  function restablecerVista() {
    setZoom(1);
    setPanX(MARGEN_REGLA_PX);
    setPanY(MARGEN_REGLA_PX);
  }

  const noSeExportaPor =
    objetos.length === 0
      ? "Agregá al menos un objeto al lienzo antes de exportar."
      : objetosFueraDeArea.length > 0
        ? "Movés o achicá los objetos que no caben en el área de trabajo antes de exportar."
        : null;

  const noSeGuardaPor =
    objetos.length === 0
      ? "Agregá al menos un objeto al lienzo antes de guardar."
      : !nombreProyecto.trim()
        ? "Ingresá un nombre para el proyecto."
        : null;

  const colorTransformer = seleccionado
    ? objetosFueraDeArea.includes(seleccionado)
      ? "#dc2626"
      : colorSeleccionDe(seleccionado)
    : "#246bce";

  /** "Guardar como proyecto"/"Guardar cambios" (#18) -- crea el proyecto la
   * primera vez (`proyectoId` todavía `null`) y a partir de ahí actualiza la
   * misma fila. Los objetos viajan con su SVG/imagen real (`aObjetoProyecto`,
   * a diferencia de `aObjetoExportar`) -- el backend los sube a Storage y
   * guarda la key, nunca el contenido inline en la base. */
  async function guardarProyecto() {
    setGuardando(true);
    setErrorGuardar(null);
    setGuardadoOk(false);
    try {
      const cuerpo = {
        nombre: nombreProyecto.trim(),
        objetos: objetos.map(aObjetoProyecto),
      };
      const respuesta = await fetch(
        proyectoId ? `/api/proyectos/${proyectoId}` : "/api/proyectos",
        {
          method: proyectoId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        },
      );
      const resultado = (await respuesta.json()) as {
        ok: boolean;
        id?: number;
        error?: string;
      };
      if (resultado.ok && resultado.id) {
        setProyectoId(resultado.id);
        setEditandoNombre(false);
        setGuardadoOk(true);
        router.replace(`/editor?proyectoId=${resultado.id}`);
      } else {
        setErrorGuardar(resultado.error ?? "No se pudo guardar el proyecto.");
      }
    } catch {
      setErrorGuardar("No se pudo conectar con el taller.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SubirObjetoDropzone
        onAgregar={agregarObjeto}
        siguientePosicion={siguientePosicion}
      />

      {objetosFueraDeArea.length > 0 ? (
        <div
          role="alert"
          className="border-orange/30 bg-orange-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-3"
        >
          <TriangleAlertAnimado className="text-orange mt-0.5 size-4 shrink-0" />
          <p className="text-navy text-sm">
            {objetosFueraDeArea.length === 1
              ? "Un objeto no cabe"
              : `${objetosFueraDeArea.length} objetos no caben`}{" "}
            en el área de trabajo real de la máquina ({areaTrabajoAnchoMm}×
            {areaTrabajoAltoMm}mm) — movelo o achicalo antes de exportar.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <div
            ref={contenedorRef}
            role="img"
            aria-label={`Lienzo de diseño, ${objetos.length} objeto(s) sobre un área de trabajo de ${areaTrabajoAnchoMm} por ${areaTrabajoAltoMm} milímetros`}
            className="bg-surface border-border relative overflow-hidden rounded-[var(--radius-md)] border"
          >
            {montado ? (
              <>
                <Stage
                  width={anchoStagePx}
                  height={altoStagePx}
                  x={panX}
                  y={panY}
                  scaleX={zoom}
                  scaleY={zoom}
                  draggable
                  onWheel={alHacerScroll}
                  onDragMove={(e) => {
                    if (e.target.getStage() !== e.target) return;
                    setPanX(e.target.x());
                    setPanY(e.target.y());
                  }}
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage()) {
                      setSeleccionadoId(null);
                    }
                  }}
                >
                  <Layer>
                    <Rect
                      x={0}
                      y={0}
                      width={anchoContenidoPx}
                      height={altoContenidoPx}
                      fill="#ffffff"
                      stroke="#e2e8f0"
                    />
                    <LienzoGrilla
                      areaTrabajoAnchoMm={areaTrabajoAnchoMm}
                      areaTrabajoAltoMm={areaTrabajoAltoMm}
                      pxPorMm={pxPorMm}
                      zoom={zoom}
                    />
                    {objetos.map((objeto) => (
                      <ObjetoLienzoKonva
                        key={objeto.id}
                        objeto={objeto}
                        pxPorMm={pxPorMm}
                        areaTrabajoAltoMm={areaTrabajoAltoMm}
                        seleccionado={objeto.id === seleccionadoId}
                        excedeArea={objetoExcedeArea(
                          objeto,
                          areaTrabajoAnchoMm,
                          areaTrabajoAltoMm,
                        )}
                        vistaToolpath={vistaToolpath}
                        color={colorSeleccionDe(objeto)}
                        onSeleccionar={() => setSeleccionadoId(objeto.id)}
                        onMover={(xMm, yMm) =>
                          actualizarCampos(objeto.id, { xMm, yMm })
                        }
                        onTransformar={(cambios) =>
                          actualizarCampos(objeto.id, cambios)
                        }
                        registrarNodo={(nodo) => {
                          if (nodo) nodosRef.current.set(objeto.id, nodo);
                          else nodosRef.current.delete(objeto.id);
                        }}
                      />
                    ))}
                    <Transformer
                      ref={transformerRef}
                      enabledAnchors={ANCLAS_TRANSFORMER}
                      rotateEnabled
                      borderEnabled={false}
                      anchorSize={9}
                      anchorCornerRadius={2}
                      anchorFill="#ffffff"
                      anchorStroke={colorTransformer}
                      rotateAnchorOffset={22}
                      keepRatio
                      boundBoxFunc={(cajaAnterior, cajaNueva) =>
                        Math.abs(cajaNueva.width) < 10 ||
                        Math.abs(cajaNueva.height) < 10
                          ? cajaAnterior
                          : cajaNueva
                      }
                    />
                  </Layer>
                  <LienzoReglas
                    vista={vista}
                    anchoStagePx={anchoStagePx}
                    altoStagePx={altoStagePx}
                    margenPx={MARGEN_REGLA_PX}
                  />
                </Stage>

                {seleccionado
                  ? (() => {
                      const limites = limitesDe(seleccionado);
                      const centroXMm = (limites.minXMm + limites.maxXMm) / 2;
                      return (
                        <BarraAccionesObjeto
                          xPx={xMmAPantalla(centroXMm, vista)}
                          yPx={yMmAPantalla(limites.maxYMm, vista) - 8}
                          onEspejarHorizontal={() =>
                            espejarObjeto(seleccionado.id, "horizontal")
                          }
                          onEspejarVertical={() =>
                            espejarObjeto(seleccionado.id, "vertical")
                          }
                          onDuplicar={() => duplicarObjeto(seleccionado.id)}
                          onEliminar={() => eliminarObjeto(seleccionado.id)}
                        />
                      );
                    })()
                  : null}
              </>
            ) : (
              <div
                style={{
                  aspectRatio: `${areaTrabajoAnchoMm} / ${areaTrabajoAltoMm}`,
                }}
                className="bg-navy-soft flex items-center justify-center text-sm"
              >
                Cargando lienzo…
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={alejar}
                aria-label="Alejar"
                className={iconButtonClasses()}
              >
                −
              </button>
              <span className="text-text-muted w-12 text-center font-mono text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={acercar}
                aria-label="Acercar"
                className={iconButtonClasses()}
              >
                +
              </button>
              <button
                type="button"
                onClick={restablecerVista}
                className="text-text-muted hover:text-navy px-1.5 text-xs underline-offset-2 hover:underline"
              >
                Restablecer vista
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vistaToolpath}
                onChange={(e) => setVistaToolpath(e.target.checked)}
                className="accent-blue size-4"
              />
              <span className="text-navy">Ver toolpath generado</span>
            </label>
          </div>

          {objetos.length > 0 ? (
            <ul
              className="flex flex-wrap gap-1.5"
              aria-label="Objetos del lienzo"
            >
              {objetos.map((objeto) => (
                <li
                  key={objeto.id}
                  className={clsx(
                    "flex items-center gap-1 rounded-full border pl-2.5 text-xs font-medium",
                    objeto.id === seleccionadoId
                      ? "border-blue bg-blue-soft text-navy"
                      : "border-border text-text-muted",
                    objetoExcedeArea(
                      objeto,
                      areaTrabajoAnchoMm,
                      areaTrabajoAltoMm,
                    ) && "border-danger/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSeleccionadoId(objeto.id)}
                    aria-pressed={objeto.id === seleccionadoId}
                    className="py-1 hover:underline"
                  >
                    {objeto.nombre}
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${objeto.nombre}`}
                    onClick={() => eliminarObjeto(objeto.id)}
                    className={iconButtonClasses("danger", "size-6")}
                  >
                    <TrashCanAnimado className="size-3" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Card className="flex flex-col gap-1.5 p-4">
            <Button
              variant="primary"
              onClick={exportarGcode}
              disabled={exportando || noSeExportaPor !== null}
              loading={exportando}
              title={noSeExportaPor ?? undefined}
            >
              {exportando ? "Exportando…" : "Exportar G-code combinado"}
            </Button>
            {noSeExportaPor ? (
              <p className="text-text-muted text-xs">{noSeExportaPor}</p>
            ) : (
              <p className="text-text-muted text-xs">
                Genera un solo G-code con todos los objetos del lienzo, en su
                posición y rotación actuales, y abre el link de descarga.
              </p>
            )}
            {errorExportar ? (
              <p role="alert" className="text-danger text-xs font-medium">
                {errorExportar}
              </p>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            {editandoNombre ? (
              <Field label="Nombre del proyecto">
                {(id, describedBy) => (
                  <input
                    id={id}
                    type="text"
                    value={nombreProyecto}
                    onChange={(e) => setNombreProyecto(e.target.value)}
                    aria-describedby={describedBy}
                    placeholder="Ej. Logo del taller"
                    className={INPUT_CLASSES}
                  />
                )}
              </Field>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-navy text-sm font-medium">
                  {nombreProyecto}
                </p>
                <button
                  type="button"
                  onClick={() => setEditandoNombre(true)}
                  className="text-blue text-xs font-medium hover:underline"
                >
                  Renombrar
                </button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={guardarProyecto}
              disabled={guardando || noSeGuardaPor !== null}
              loading={guardando}
              title={noSeGuardaPor ?? undefined}
            >
              {guardando
                ? "Guardando…"
                : proyectoId
                  ? "Guardar cambios"
                  : "Guardar como proyecto"}
            </Button>
            {noSeGuardaPor ? (
              <p className="text-text-muted text-xs">{noSeGuardaPor}</p>
            ) : (
              <p className="text-text-muted text-xs">
                {proyectoId
                  ? "Actualiza este mismo proyecto guardado."
                  : "Guarda la posición, rotación y parámetros de cada objeto para reabrirlos después, sin resubir nada."}
              </p>
            )}
            {errorGuardar ? (
              <p role="alert" className="text-danger text-xs font-medium">
                {errorGuardar}
              </p>
            ) : null}
            {guardadoOk && !errorGuardar ? (
              <p className="text-teal text-xs font-medium">
                Proyecto guardado.
              </p>
            ) : null}
          </Card>
        </div>

        <Card className="h-fit p-4">
          {seleccionado ? (
            <PanelObjeto
              objeto={seleccionado}
              excedeArea={objetoExcedeArea(
                seleccionado,
                areaTrabajoAnchoMm,
                areaTrabajoAltoMm,
              )}
              onCambiar={(cambios) =>
                actualizarCampos(seleccionado.id, cambios)
              }
              onEliminar={() => eliminarObjeto(seleccionado.id)}
              onGenerarToolpath={(operacion) =>
                generarToolpath(seleccionado.id, operacion)
              }
            />
          ) : (
            <p className="text-text-muted text-sm">
              Subí un objeto o seleccioná uno del lienzo para editar su
              posición, rotación y parámetros.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
