"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Layer, Rect, Stage, Transformer } from "react-konva";
import { clsx } from "clsx";
import { Button, LinkButton } from "@/components/ui/button";
import { AyudaLink } from "@/components/ui/ayuda-link";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { INPUT_CLASSES } from "@/components/ui/field";
import { iconButtonClasses } from "@/lib/button-styles";
import { ArrowLeftAnimado } from "@/components/ui/icons/arrow-left-animado";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { ObjetoLienzoKonva } from "@/components/editor/objeto-lienzo-konva";
import { LienzoGrilla } from "@/components/editor/lienzo-grilla";
import { LienzoReglas } from "@/components/editor/lienzo-reglas";
import { BarraAccionesObjeto } from "@/components/editor/barra-acciones-objeto";
import { PanelObjeto } from "@/components/editor/panel-objeto";
import {
  SubirObjetoDropzone,
  type SvgBibliotecaItem,
} from "@/components/editor/subir-objeto-dropzone";
import {
  EditorSidebarRiel,
  type PanelSidebarId,
} from "@/components/editor/editor-sidebar-riel";
import {
  cajasSeIntersectan,
  limitesEnPx,
  limitesUnionDe,
  objetoExcedeArea,
  type CajaPx,
} from "@/lib/editor-area";
import { colorSeleccionDe } from "@/lib/editor-colores";
import { listarFichasCliente, type FichaCliente } from "@/lib/fichas-cliente";
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
import {
  preprocesamientoDe,
  type PreprocesamientoRaster,
} from "@/lib/raster-preprocesamiento";
import { conversionSvgSchema, type ModoGrabadoSvg } from "@/lib/svg-schema";
import {
  PARAMETROS_POR_DEFECTO,
  type EstadoToolpath,
  type ObjetoLienzo,
  type Operacion,
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
    : {
        tipo: "raster",
        ...comunes,
        dataUri: objeto.dataUri,
        ...preprocesamientoDe(objeto),
      };
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
    // #17 (posterior a #18): material+espesor de modo Producción -- sin
    // esto, reabrir un proyecto guardado en Producción pierde el "candado"
    // aunque los números de velocidad/potencia se mantengan bien.
    materialProduccion: objeto.materialProduccion,
    // #150 (posterior a #18 y a #108): vínculo con el objeto de origen, si
    // lo hay -- ver la nota de diseño en `editor-tipos.ts`. Antes de #150
    // no se persistía porque el campo no tenía ningún comportamiento real
    // todavía; ahora sí, así que perderlo al reabrir un proyecto
    // desincronizaría el contorno de su imagen en silencio.
    objetoOrigenId: objeto.objetoOrigenId,
  };
  return objeto.tipo === "svg"
    ? {
        tipo: "svg",
        ...comunes,
        nombreArchivoSvg: objeto.nombreArchivoSvg,
        contenidoSvg: objeto.contenidoSvg,
        resolucionRellenoMm: objeto.resolucionRellenoMm,
      }
    : {
        tipo: "raster",
        ...comunes,
        dataUri: objeto.dataUri,
        ...preprocesamientoDe(objeto),
      };
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
  /** Issue #183: SVGs ya subidos a la biblioteca compartida con "Grabado
   * Vectorial" -- se pasan al panel "Subir" para poder reusar uno en vez
   * de resubir el archivo. */
  bibliotecaSvg: SvgBibliotecaItem[];
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

/** Debajo de este desplazamiento (px de contenido, ver `limitesEnPx`) un
 * mousedown+mouseup sobre área vacía del lienzo (#149) se trata como un
 * click simple (deseleccionar), no como un marquee -- si no, cualquier click
 * con un temblor mínimo del mouse dispararía selección por rectángulo en
 * vez de limpiar la selección. */
const UMBRAL_MARQUEE_PX = 4;

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
  bibliotecaSvg,
}: EditorLienzoProps) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [objetos, setObjetos] = useState<ObjetoLienzo[]>(
    () => proyectoInicial?.objetos ?? [],
  );
  // #149 -- selección múltiple: reemplaza el `seleccionadoId` único de #107
  // por una lista de ids. Un solo id seleccionado sigue siendo el caso más
  // común (`seleccionadoUnico` más abajo), así que el panel numérico y el
  // resto de la UI de un solo objeto no cambiaron de forma, solo de dónde
  // sacan el objeto.
  const [seleccionadosIds, setSeleccionadosIds] = useState<string[]>([]);
  const [vistaToolpath, setVistaToolpath] = useState(false);

  // Modo Producción/Prueba (#17): GLOBAL a todo el lienzo -- es una
  // intención de todo el trabajo en curso ("¿esto es una prueba de
  // parámetros o una pieza real?"), no una propiedad de un objeto puntual
  // (a diferencia de `materialProduccion`/las Fichas elegidas, que sí son
  // por-objeto, ver nota en `editor-tipos.ts`). No se persiste en el
  // proyecto guardado (#18) a propósito: no cambia el G-code exportado
  // (eso ya quedó fijado en `parametros` de cada objeto), así que reabrir
  // un proyecto siempre arranca en Prueba, con los mismos números.
  const [modoProduccion, setModoProduccion] = useState(false);
  const [fichas, setFichas] = useState<FichaCliente[]>([]);
  const [cargandoFichas, setCargandoFichas] = useState(false);
  const [errorFichas, setErrorFichas] = useState<string | null>(null);

  // Las Fichas se cargan recién al entrar a Producción por primera vez, no
  // en cada carga del editor -- la mayoría de las sesiones son de Prueba y
  // no necesitan este round-trip.
  useEffect(() => {
    if (!modoProduccion || fichas.length > 0 || cargandoFichas) return;
    // Fetch de datos externos (Fichas de Parámetro) al entrar a Producción
    // -- mismo patrón justificado que `setMontado` más arriba en este
    // archivo, no hay forma de derivarlo durante el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargandoFichas(true);
    setErrorFichas(null);
    listarFichasCliente()
      .then(setFichas)
      .catch((error: unknown) =>
        setErrorFichas(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las Fichas de Parámetro.",
        ),
      )
      .finally(() => setCargandoFichas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoProduccion]);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [anchoContenedorPx, setAnchoContenedorPx] = useState(600);
  // Issue #178: antes de este layout inmersivo, el contenedor del lienzo
  // nunca tenía una altura propia (crecía en flujo normal de página según
  // el ancho, ver `pxPorMm` más abajo) -- ahora que ocupa `flex-1` de un
  // viewport bloqueado, si el `pxPorMm` siguiera derivándose solo del ancho
  // el canvas podría quedar más alto que el espacio real disponible y
  // recortarse. Se observa también la altura para que `pxPorMm` sea el
  // mínimo entre "entra por ancho" y "entra por alto" (como `object-fit:
  // contain`) -- nunca se agregó una envoltura de centrado aparte porque
  // eso desalinearía `contenedorRef.getBoundingClientRect()` de la
  // traducción px↔mm que ya usan `posicionEnPxDeContenido`/el marquee/los
  // handles del `Transformer` (ver más abajo): el `Stage` sigue ocupando el
  // contenedor entero (ancho Y alto), el sobrante queda como lienzo en
  // blanco -- mismo patrón que ya existía para el ancho.
  const [altoContenedorPx, setAltoContenedorPx] = useState(400);
  // Issue #178: qué panel del riel de íconos (Subir/Capas) está desplegado
  // -- overlay sobre el lienzo, nunca empuja (ver `EditorSidebarRiel`).
  const [panelSidebar, setPanelSidebar] = useState<PanelSidebarId | null>(null);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  // Contorno de corte automático (#108) -- estado de un único pedido a la
  // vez, igual criterio que `exportando`/`errorExportar`: solo el objeto
  // seleccionado puede disparar la acción desde `PanelObjeto`.
  const [generandoContorno, setGenerandoContorno] = useState(false);
  const [errorContorno, setErrorContorno] = useState<string | null>(null);

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

  // #149 -- marquee (rectángulo de selección) sobre área vacía del lienzo.
  // El `Stage` ya usaba drag simple para pan (#107); un plain-drag no puede
  // significar las dos cosas a la vez, así que el pan pasa a requerir
  // mantener espacio apretado (patrón Figma/Photoshop) y el drag suelto
  // sobre área vacía queda libre para el marquee. Arrastrar un objeto en sí
  // sigue funcionando igual que siempre (cada objeto tiene su propio
  // `draggable`, independiente del `draggable` del `Stage`).
  const [espacioPresionado, setEspacioPresionado] = useState(false);
  const [marquee, setMarquee] = useState<{
    inicioXPx: number;
    inicioYPx: number;
    actualXPx: number;
    actualYPx: number;
    aditivo: boolean;
  } | null>(null);
  const marqueeRef = useRef<typeof marquee>(null);

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
      const rect = entradas[0]?.contentRect;
      if (!rect) return;
      setAnchoContenedorPx(rect.width);
      setAltoContenedorPx(rect.height);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // El ancho/alto disponibles para el área de trabajo descuentan la banda
  // fija de la regla (#107) -- el `Stage` completo (regla + contenido)
  // sigue ocupando el contenedor entero. `pxPorMm` es el mínimo entre "entra
  // por ancho" y "entra por alto" (issue #178, ver el comentario de
  // `altoContenedorPx` más arriba) -- antes de este layout inmersivo el
  // contenedor no tenía altura propia, así que solo hacía falta el ancho.
  const anchoDisponiblePx = Math.max(anchoContenedorPx - MARGEN_REGLA_PX, 50);
  const altoDisponiblePx = Math.max(altoContenedorPx - MARGEN_REGLA_PX, 50);
  const pxPorMm = Math.min(
    anchoDisponiblePx / areaTrabajoAnchoMm,
    altoDisponiblePx / areaTrabajoAltoMm,
  );
  const anchoContenidoPx = areaTrabajoAnchoMm * pxPorMm;
  const altoContenidoPx = areaTrabajoAltoMm * pxPorMm;
  const anchoStagePx = anchoContenedorPx;
  const altoStagePx = altoContenedorPx;

  const vista: VistaLienzo = useMemo(
    () => ({ pxPorMm, zoom, panX, panY, areaTrabajoAltoMm }),
    [pxPorMm, zoom, panX, panY, areaTrabajoAltoMm],
  );

  const seleccionados = useMemo(
    () => objetos.filter((o) => seleccionadosIds.includes(o.id)),
    [objetos, seleccionadosIds],
  );
  // El panel numérico (`PanelObjeto`) y sus campos de posición/rotación/
  // velocidad/potencia solo tienen sentido para UN objeto a la vez -- con
  // varios seleccionados se muestra el resumen de conteo + acciones en lote
  // en su lugar (ver el bloque a la derecha del lienzo, más abajo).
  const seleccionadoUnico =
    seleccionados.length === 1 ? seleccionados[0] : null;
  // Bounding box combinado de la selección (#149) -- posiciona
  // `BarraAccionesObjeto`, ver más abajo; `null` sin selección (no hay barra
  // que mostrar).
  const limitesSeleccion = useMemo(
    () => limitesUnionDe(seleccionados),
    [seleccionados],
  );

  const objetosFueraDeArea = useMemo(
    () =>
      objetos.filter((o) =>
        objetoExcedeArea(o, areaTrabajoAnchoMm, areaTrabajoAltoMm),
      ),
    [objetos, areaTrabajoAnchoMm, areaTrabajoAltoMm],
  );

  // Engancha (o desengancha) el Transformer a los nodos Konva de TODOS los
  // objetos seleccionados (#149) -- el Transformer es uno solo por lienzo,
  // compartido, y se reapunta cada vez que cambia la selección. Con más de
  // un nodo, Konva arma solo el bounding box combinado y aplica cualquier
  // mover/rotar/escalar como transformación rígida a cada nodo individual
  // -- cada uno sigue reportando su propio resultado final por
  // `onTransformEnd` (`alTerminarTransformar` en `objeto-lienzo-konva.tsx`),
  // así que no hace falta ninguna lógica extra acá para que la selección
  // múltiple se mueva/rote/escale como unidad.
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodos = seleccionadosIds
      .map((id) => nodosRef.current.get(id))
      .filter((nodo): nodo is Konva.Group => nodo !== undefined);
    transformer.nodes(nodos);
    transformer.getLayer()?.batchDraw();
  }, [seleccionadosIds, objetos]);

  // Nudge por teclado (#107, extendido por #149 a toda la selección):
  // flechas mueven TODOS los objetos seleccionados 1mm, 0.1mm con Shift, sin
  // cambiar sus posiciones relativas entre sí. Se ignora mientras el foco
  // está en un campo de texto (ej. escribiendo en el panel numérico) para no
  // pelear con el cursor.
  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if (
        seleccionadosIds.length === 0 ||
        elementoEsCampoDeTexto(document.activeElement)
      ) {
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
      // Cualquier miembro de la selección sirve como representante: como
      // `propagarAlGrupo` está en `true`, el delta se aplica a todo
      // `seleccionadosIds` por igual (unidad rígida), no solo al primero.
      // El chequeo de `.length === 0` de arriba ya garantiza que hay al
      // menos uno -- este `if` es solo para que TypeScript lo vea también
      // (`noUncheckedIndexedAccess` tipa `arr[0]` como `T | undefined`).
      const idRepresentante = seleccionadosIds[0];
      if (idRepresentante === undefined) return;
      moverOTransformarObjeto(
        idRepresentante,
        (o) => ({
          xMm: o.xMm + deltaXMm,
          yMm: o.yMm + deltaYMm,
        }),
        { propagarAlGrupo: true },
      );
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
    // `moverOTransformarObjeto` no entra a la lista: se redefine en cada
    // render y siempre cierra sobre el mismo `seleccionadosIds` de ESE
    // render -- como el efecto ya se vuelve a correr cuando
    // `seleccionadosIds` cambia, captura la versión fresca igual, sin
    // necesidad de re-registrar el listener en cada render de más.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadosIds]);

  // Pan con espacio apretado (#149, ver nota en la declaración de `marquee`
  // más arriba) -- mismo criterio de "ignorar mientras se escribe" que el
  // nudge, para no capturar la barra espaciadora dentro de un campo de
  // texto.
  useEffect(() => {
    function alApretar(evento: KeyboardEvent) {
      if (
        evento.code === "Space" &&
        !elementoEsCampoDeTexto(document.activeElement)
      ) {
        setEspacioPresionado(true);
      }
    }
    function alSoltar(evento: KeyboardEvent) {
      if (evento.code === "Space") setEspacioPresionado(false);
    }
    window.addEventListener("keydown", alApretar);
    window.addEventListener("keyup", alSoltar);
    return () => {
      window.removeEventListener("keydown", alApretar);
      window.removeEventListener("keyup", alSoltar);
    };
  }, []);

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
    setSeleccionadosIds([objeto.id]);
  }

  /** #149 -- click sobre un objeto individual. `aditivo` viene de Shift: sin
   * Shift, reemplaza la selección entera por este objeto (comportamiento
   * pre-#149); con Shift, lo suma o lo saca de la selección múltiple sin
   * tocar el resto. */
  function seleccionarObjeto(id: string, aditivo: boolean) {
    setSeleccionadosIds((anteriores) => {
      if (!aditivo) return [id];
      return anteriores.includes(id)
        ? anteriores.filter((actual) => actual !== id)
        : [...anteriores, id];
    });
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

  /** Actualiza cambios (posición/rotación/tamaño u otro campo común a
   * ambas variantes de `ObjetoLienzo`) y además propaga el mismo delta de
   * posición/rotación/escala al objeto vinculado (#150, `objetoOrigenId` de
   * #108) si lo hay -- se usa en cualquier punto que mueva/rote/escale un
   * objeto (drag, handles del `Transformer`,
   * nudge por teclado, panel numérico), para que el contorno de corte
   * generado automáticamente siga a su imagen de origen en vez de quedar
   * atrás cuando se ajusta la imagen después de generarlo.
   *
   * Recibe una función (no un objeto de cambios ya resuelto) porque el
   * nudge por teclado necesita partir del valor actual (`o.xMm + delta`),
   * mismo motivo que `actualizarObjeto`. Como el contorno nace centrado
   * exactamente en el mismo punto que la imagen (`generarContornoCorte`),
   * aplicarle el mismo delta absoluto (traslación, rotación, factor de
   * escala) alcanza para mantenerlo coincidente -- no hace falta pivotear
   * alrededor de un centro distinto. Los campos no geométricos de `cambios`
   * (`operaciones`, `parametros`, etc.) nunca se propagan: cada objeto
   * vinculado sigue teniendo sus propias operaciones/material, el vínculo
   * es solo geométrico. Solo se propaga hacia adelante (origen → vinculado)
   * -- mover el contorno solo, a mano, no desincroniza la imagen.
   *
   * `propagarAlGrupo` (#149): cuando `id` integra la selección múltiple
   * actual, el mismo delta de TRASLACIÓN (nunca rotación/escala -- un
   * drag simple no rota ni escala) se replica al resto de `seleccionadosIds`
   * como unidad rígida. Default `false` a propósito: los handles del
   * `Transformer` (resize/rotación) ya reportan, nodo por nodo, el estado
   * final de CADA objeto seleccionado (Konva arma y deshace el bounding box
   * combinado solo) -- volver a aplicarles el delta acá los movería doble.
   * Solo el drag simple (`onMover`, sin `Transformer` de por medio) y el
   * nudge por teclado necesitan este parámetro en `true`. Cualquier objeto
   * vinculado (`objetoOrigenId`) a ALGÚN miembro del grupo que se mueve
   * -- no solo a `id` -- también se arrastra con el mismo delta. */
  function moverOTransformarObjeto(
    id: string,
    calcularCambios: (
      objeto: ObjetoLienzo,
    ) => Omit<Partial<ObjetoLienzo>, "tipo">,
    opciones: { propagarAlGrupo?: boolean } = {},
  ) {
    const { propagarAlGrupo = false } = opciones;
    setObjetos((anteriores) => {
      const original = anteriores.find((o) => o.id === id);
      if (!original) return anteriores;
      const cambios = calcularCambios(original);
      const actualizado = { ...original, ...cambios } as ObjetoLienzo;

      const deltaXMm = actualizado.xMm - original.xMm;
      const deltaYMm = actualizado.yMm - original.yMm;
      const deltaRotacionDeg = actualizado.rotacionDeg - original.rotacionDeg;
      const escalaAncho =
        original.anchoMm !== 0 ? actualizado.anchoMm / original.anchoMm : 1;
      const escalaAlto =
        original.altoMm !== 0 ? actualizado.altoMm / original.altoMm : 1;

      if (
        deltaXMm === 0 &&
        deltaYMm === 0 &&
        deltaRotacionDeg === 0 &&
        escalaAncho === 1 &&
        escalaAlto === 1
      ) {
        return anteriores.map((o) => (o.id === id ? actualizado : o));
      }

      const grupo =
        propagarAlGrupo && seleccionadosIds.includes(id)
          ? new Set(seleccionadosIds)
          : new Set([id]);

      return anteriores.map((o) => {
        if (o.id === id) return actualizado;
        if (grupo.has(o.id)) {
          return { ...o, xMm: o.xMm + deltaXMm, yMm: o.yMm + deltaYMm };
        }
        if (!o.objetoOrigenId || !grupo.has(o.objetoOrigenId)) return o;
        return {
          ...o,
          xMm: o.xMm + deltaXMm,
          yMm: o.yMm + deltaYMm,
          rotacionDeg: (((o.rotacionDeg + deltaRotacionDeg) % 360) + 360) % 360,
          anchoMm: o.anchoMm * escalaAncho,
          altoMm: o.altoMm * escalaAlto,
        };
      });
    });
  }

  /** #109 -- `preprocesamiento` es exclusivo de los objetos raster, así que
   * (mismo motivo que `toolpath`, ver el comentario de `actualizarObjeto`)
   * necesita narrowear al tipo concreto en vez de pasar por
   * `moverOTransformarObjeto`/`Partial<ObjetoLienzo>` genérico. */
  function cambiarPreprocesamiento(
    id: string,
    preprocesamiento: PreprocesamientoRaster,
  ) {
    actualizarObjeto(id, (o) =>
      o.tipo === "raster" ? { ...o, ...preprocesamiento } : o,
    );
  }

  /** Eliminar un objeto que tiene un contorno vinculado (#150,
   * `objetoOrigenId`) es el caso de riesgo real que motivó ese ticket: si
   * el contorno queda huérfano, el operario puede no notar que ya no
   * corresponde a ninguna imagen y exportar igual -- el G-code corta un
   * contorno que ya no representa nada. En vez de dejarlo huérfano en
   * silencio, se pide confirmación explícita para borrar ambos juntos;
   * cancelar aborta la eliminación completa. Generalizado a lista de ids
   * (#149, `eliminarObjetos`): `vinculados` junta los contornos de
   * CUALQUIER objeto de la lista que no esté ya incluido él mismo. */
  const [pendienteEliminar, setPendienteEliminar] = useState<{
    ids: string[];
    vinculados: ObjetoLienzo[];
  } | null>(null);

  function eliminarObjetosInmediato(ids: Set<string>) {
    setObjetos((anteriores) => anteriores.filter((o) => !ids.has(o.id)));
    setSeleccionadosIds((anteriores) =>
      anteriores.filter((id) => !ids.has(id)),
    );
  }

  /** #149 -- eliminar acepta una lista de ids: `[id]` cubre el caso de un
   * solo objeto (panel numérico, chip de la lista de objetos) y una lista
   * más larga cubre "eliminar selección" desde `BarraAccionesObjeto`. */
  function eliminarObjetos(ids: string[]) {
    const idsAEliminar = new Set(ids);
    const vinculados = objetos.filter(
      (o) =>
        o.objetoOrigenId &&
        idsAEliminar.has(o.objetoOrigenId) &&
        !idsAEliminar.has(o.id),
    );
    if (vinculados.length > 0) {
      setPendienteEliminar({ ids, vinculados });
      return;
    }
    eliminarObjetosInmediato(idsAEliminar);
  }

  function confirmarEliminarConVinculados() {
    if (!pendienteEliminar) return;
    eliminarObjetosInmediato(
      new Set([
        ...pendienteEliminar.ids,
        ...pendienteEliminar.vinculados.map((v) => v.id),
      ]),
    );
    setPendienteEliminar(null);
  }

  /** Clona cada objeto de `ids` con un id nuevo, corrido unos mm para que se
   * note que hay uno de más (#107, extendido a lote por #149). El toolpath
   * cacheado no se copia: quedó calculado para la posición/tamaño del
   * original y estos son objetos distintos que el usuario puede terminar
   * redimensionando aparte. Los duplicados quedan seleccionados al terminar
   * -- mismo criterio que ya tenía el duplicado de un solo objeto. */
  function duplicarObjetos(ids: string[]) {
    const duplicados = ids.flatMap((id) => {
      const objeto = objetos.find((o) => o.id === id);
      if (!objeto) return [];
      const posicion = {
        id: crypto.randomUUID(),
        xMm: objeto.xMm + DESPLAZAMIENTO_DUPLICADO_MM,
        yMm: objeto.yMm - DESPLAZAMIENTO_DUPLICADO_MM,
      };
      return [
        objeto.tipo === "svg"
          ? { ...objeto, ...posicion, toolpath: {} }
          : { ...objeto, ...posicion },
      ];
    });
    if (duplicados.length === 0) return;
    setObjetos((anteriores) => [...anteriores, ...duplicados]);
    setSeleccionadosIds(duplicados.map((o) => o.id));
  }

  /** #149 -- "espejar" en lote es la MISMA acción de #107 (toggle del flag
   * `espejadoH`/`espejadoV` de cada objeto) aplicada a cada objeto de `ids`
   * por separado, no un espejo de la disposición del grupo como conjunto
   * (que además invertiría las posiciones relativas entre objetos, algo que
   * el ticket no pidió y que complicaría bastante el cálculo) -- decisión
   * de alcance documentada acá porque "espejar" es ambiguo con selección
   * múltiple. */
  function espejarObjetos(ids: string[], eje: "horizontal" | "vertical") {
    const idsAEspejar = new Set(ids);
    setObjetos((anteriores) =>
      anteriores.map((o) => {
        if (!idsAEspejar.has(o.id)) return o;
        return eje === "horizontal"
          ? { ...o, espejadoH: !o.espejadoH }
          : { ...o, espejadoV: !o.espejadoV };
      }),
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

  /**
   * Issue #108: genera el vector de corte alrededor de una imagen raster y
   * lo agrega como objeto SVG independiente, centrado exactamente sobre
   * ella (mismo `xMm`/`yMm`/`rotacionDeg`/espejado que la imagen en el
   * momento de generarlo). No hay una mecánica de agrupación de objetos en
   * el editor todavía (ver `objetoOrigenId` en `editor-tipos.ts`) -- mover,
   * rotar o escalar la imagen después NO arrastra a este contorno; el
   * usuario los reposiciona a mano si hace falta, o vuelve a generar el
   * contorno una vez que termine de ajustar la imagen.
   */
  async function generarContornoCorte(id: string, margenMm: number) {
    const objeto = objetos.find((o) => o.id === id);
    if (!objeto || objeto.tipo !== "raster") return;

    setGenerandoContorno(true);
    setErrorContorno(null);
    try {
      const respuesta = await fetch("/api/editor/contorno-corte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUri: objeto.dataUri,
          anchoMm: objeto.anchoMm,
          altoMm: objeto.altoMm,
          margenMm,
        }),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        contenidoSvg?: string;
        anchoMm?: number;
        altoMm?: number;
        error?: string;
      };
      if (
        !cuerpo.ok ||
        !cuerpo.contenidoSvg ||
        cuerpo.anchoMm === undefined ||
        cuerpo.altoMm === undefined
      ) {
        throw new Error(
          cuerpo.error ?? "No se pudo generar el contorno de corte.",
        );
      }
      agregarObjeto({
        id: crypto.randomUUID(),
        tipo: "svg",
        nombre: `Contorno de ${objeto.nombre}`,
        // No hay un nombre real en la biblioteca de SVG (`/api/svgs`) para
        // este contorno generado -- "Ver toolpath" (pensado para SVG subidos
        // a mano) no va a poder convertirlo hasta que #108 persista también
        // el contorno ahí, fuera de alcance de este ticket.
        nombreArchivoSvg: `contorno-${objeto.id}`,
        contenidoSvg: cuerpo.contenidoSvg,
        xMm: objeto.xMm,
        yMm: objeto.yMm,
        anchoMm: cuerpo.anchoMm,
        altoMm: cuerpo.altoMm,
        rotacionDeg: objeto.rotacionDeg,
        operaciones: ["corte"],
        parametros: PARAMETROS_POR_DEFECTO,
        mantenerProporcion: true,
        espejadoH: objeto.espejadoH,
        espejadoV: objeto.espejadoV,
        // #17 se integró después de que esto se escribió (#108): el
        // contorno nace en modo Prueba, sin Ficha elegida todavía -- igual
        // que cualquier objeto nuevo del lienzo.
        materialProduccion: null,
        resolucionRellenoMm: 0.3,
        toolpath: {},
        objetoOrigenId: objeto.id,
      });
    } catch (error) {
      setErrorContorno(
        error instanceof Error
          ? error.message
          : "No se pudo generar el contorno de corte.",
      );
    } finally {
      setGenerandoContorno(false);
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

  /** #149 -- convierte coordenadas de pantalla (`clientX`/`clientY` de un
   * evento nativo del mouse) a "px de contenido" (mm × pxPorMm, SIN zoom/pan
   * del `Stage`) -- mismo espacio de coordenadas que usan los hijos del
   * `Layer` y que `limitesEnPx` en `editor-area.ts`. Reusa `pantallaAMm`
   * (ya pensada para coordenadas relativas al contenedor del lienzo, ver
   * `alHacerScroll`) como paso intermedio. */
  function posicionEnPxDeContenido(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const mundo = pantallaAMm(clientX - rect.left, clientY - rect.top, vista);
    return {
      x: mundo.xMm * pxPorMm,
      y: (areaTrabajoAltoMm - mundo.yMm) * pxPorMm,
    };
  }

  /** #149 -- mousedown sobre área vacía del lienzo (nunca sobre un objeto,
   * eso lo maneja `ObjetoLienzoKonva` aparte): arranca el marquee y
   * engancha listeners de `window` (no solo del `Stage`) para que el
   * arrastre se siga registrando aunque el mouse salga del canvas antes de
   * soltar el botón. */
  function iniciarMarquee(evento: KonvaEventObject<MouseEvent>) {
    if (espacioPresionado) return; // ese drag lo maneja el pan del Stage
    if (evento.target !== evento.target.getStage()) return;
    const pos = posicionEnPxDeContenido(evento.evt.clientX, evento.evt.clientY);
    if (!pos) return;
    const inicial = {
      inicioXPx: pos.x,
      inicioYPx: pos.y,
      actualXPx: pos.x,
      actualYPx: pos.y,
      aditivo: evento.evt.shiftKey,
    };
    marqueeRef.current = inicial;
    setMarquee(inicial);

    function mover(e: MouseEvent) {
      const actual = posicionEnPxDeContenido(e.clientX, e.clientY);
      if (!actual || !marqueeRef.current) return;
      const siguiente = {
        ...marqueeRef.current,
        actualXPx: actual.x,
        actualYPx: actual.y,
      };
      marqueeRef.current = siguiente;
      setMarquee(siguiente);
    }
    function soltar() {
      finalizarMarquee(marqueeRef.current);
      marqueeRef.current = null;
      setMarquee(null);
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    }
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
  }

  /** #149 -- al soltar el mouse: si el arrastre fue mínimo (`UMBRAL_MARQUEE_PX`)
   * se trata como un click simple sobre área vacía (limpia la selección,
   * salvo que sea un Shift+click sobre vacío, que no hace nada); si hubo
   * arrastre real, selecciona todos los objetos cuya caja se toque con el
   * rectángulo -- suma a la selección existente con Shift, la reemplaza sin
   * Shift, mismo criterio que el click individual (`seleccionarObjeto`). */
  function finalizarMarquee(m: typeof marquee) {
    if (!m) return;
    const distancia = Math.hypot(
      m.actualXPx - m.inicioXPx,
      m.actualYPx - m.inicioYPx,
    );
    if (distancia < UMBRAL_MARQUEE_PX) {
      if (!m.aditivo) setSeleccionadosIds([]);
      return;
    }
    const caja: CajaPx = {
      minX: Math.min(m.inicioXPx, m.actualXPx),
      maxX: Math.max(m.inicioXPx, m.actualXPx),
      minY: Math.min(m.inicioYPx, m.actualYPx),
      maxY: Math.max(m.inicioYPx, m.actualYPx),
    };
    const idsEnCaja = objetos
      .filter((o) =>
        cajasSeIntersectan(caja, limitesEnPx(o, pxPorMm, areaTrabajoAltoMm)),
      )
      .map((o) => o.id);
    setSeleccionadosIds((anteriores) =>
      m.aditivo
        ? Array.from(new Set([...anteriores, ...idsEnCaja]))
        : idsEnCaja,
    );
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

  // #149 -- con selección múltiple no hay "una" categoría de operación que
  // mande (podrían ser corte + grabado sólido + grabado fotorrealista a la
  // vez): si algún seleccionado excede el área se prioriza el rojo de
  // advertencia igual que antes, con exactamente un objeto se conserva el
  // color por categoría (#107), y con varios se usa el mismo azul neutro que
  // ya era el color por defecto sin selección.
  const algunSeleccionadoExcedeArea = seleccionados.some((o) =>
    objetosFueraDeArea.includes(o),
  );
  const colorTransformer = algunSeleccionadoExcedeArea
    ? "#dc2626"
    : seleccionadoUnico
      ? colorSeleccionDe(seleccionadoUnico)
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
    <div className="bg-surface flex h-screen w-screen flex-col overflow-hidden">
      <header className="border-border bg-surface z-30 flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <LinkButton href="/" variant="outline" size="sm">
            <ArrowLeftAnimado className="size-4" strokeWidth={1.75} />
            Salir
          </LinkButton>
          <LinkButton href="/editor/proyectos" variant="outline" size="sm">
            Mis proyectos
          </LinkButton>
          <AyudaLink seccion="editor" />
        </div>

        <div className="border-border h-6 border-l" />

        <div className="flex min-w-0 items-center gap-2">
          {editandoNombre ? (
            <input
              type="text"
              value={nombreProyecto}
              onChange={(e) => setNombreProyecto(e.target.value)}
              placeholder="Ej. Logo del taller"
              className={`${INPUT_CLASSES} h-8 w-44 text-sm`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoNombre(true)}
              title="Renombrar"
              className="text-navy max-w-44 truncate text-sm font-medium hover:underline"
            >
              {nombreProyecto || "Sin nombre"}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={guardarProyecto}
            disabled={guardando || noSeGuardaPor !== null}
            loading={guardando}
            title={noSeGuardaPor ?? undefined}
          >
            {guardando
              ? "Guardando…"
              : proyectoId
                ? "Guardar cambios"
                : "Guardar proyecto"}
          </Button>
          {errorGuardar ? (
            <span className="text-danger text-xs font-medium">
              {errorGuardar}
            </span>
          ) : guardadoOk ? (
            <span className="text-teal text-xs font-medium">Guardado.</span>
          ) : null}
        </div>

        <div className="border-border h-6 border-l" />

        {/* Modo Producción/Prueba (#17): switch compacto de dos estados --
         * misma lógica/nombre de siempre (bloquea velocidad/potencia a la
         * Ficha aprobada), solo cambia de posición y de forma visual (#178:
         * un control que se toca una vez por sesión no debía competir por
         * el centro del header con "Exportar", la única acción primaria). */}
        <button
          type="button"
          role="switch"
          aria-checked={modoProduccion}
          aria-label="Modo Producción o Prueba"
          onClick={() => setModoProduccion(!modoProduccion)}
          title={
            modoProduccion
              ? "Producción: velocidad y potencia quedan bloqueadas a la Ficha de Parámetro aprobada de cada objeto."
              : "Prueba: velocidad y potencia son libres, para explorar parámetros sin Ficha todavía."
          }
          className="flex items-center gap-2"
        >
          <span
            className={clsx(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
              modoProduccion ? "bg-teal" : "bg-border",
            )}
          >
            <span
              className={clsx(
                "inline-block size-4 translate-x-0.5 rounded-full bg-white transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                modoProduccion && "translate-x-4",
              )}
            />
          </span>
          <span
            className={clsx(
              "text-xs font-medium",
              modoProduccion ? "text-teal" : "text-navy",
            )}
          >
            {modoProduccion ? "Producción" : "Prueba"}
          </span>
        </button>

        <div className="flex-1" />

        <Button
          variant="primary"
          onClick={exportarGcode}
          disabled={exportando || noSeExportaPor !== null}
          loading={exportando}
          title={noSeExportaPor ?? undefined}
        >
          {exportando ? "Exportando…" : "Exportar G-code combinado"}
        </Button>
      </header>

      {objetosFueraDeArea.length > 0 || errorExportar ? (
        <div className="flex flex-col gap-1.5 px-4 py-2">
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
          {errorExportar ? (
            <p role="alert" className="text-danger text-sm font-medium">
              {errorExportar}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <EditorSidebarRiel
          panelAbierto={panelSidebar}
          onCambiarPanel={setPanelSidebar}
          contenidoSubir={
            <SubirObjetoDropzone
              onAgregar={agregarObjeto}
              siguientePosicion={siguientePosicion}
              bibliotecaSvg={bibliotecaSvg}
            />
          }
          contenidoCapas={
            // Lista simple (nombre + seleccionar + eliminar), reubicada acá
            // tal cual existía debajo del lienzo -- el panel de capas real
            // (miniatura, reordenar, mostrar/ocultar) es el issue de
            // seguimiento de #178; dejar esto vacío mientras tanto sería una
            // regresión real (hoy es la única forma de ver/elegir/borrar un
            // objeto por nombre sin tocarlo en el lienzo).
            objetos.length > 0 ? (
              <ul
                className="flex flex-col gap-1.5"
                aria-label="Objetos del lienzo"
              >
                {objetos.map((objeto) => (
                  <li
                    key={objeto.id}
                    className={clsx(
                      "flex items-center justify-between gap-1 rounded-full border py-1 pl-2.5 text-xs font-medium",
                      seleccionadosIds.includes(objeto.id)
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
                      onClick={(e) => seleccionarObjeto(objeto.id, e.shiftKey)}
                      aria-pressed={seleccionadosIds.includes(objeto.id)}
                      className="truncate py-1 hover:underline"
                      title="Click para seleccionar, Shift+click para sumar/sacar de la selección"
                    >
                      {objeto.nombre}
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${objeto.nombre}`}
                      onClick={() => eliminarObjetos([objeto.id])}
                      className={iconButtonClasses("danger", "size-6 shrink-0")}
                    >
                      <TrashCanAnimado className="size-3" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted text-sm">
                Todavía no hay ningún objeto en el lienzo.
              </p>
            )
          }
        />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={contenedorRef}
            role="img"
            aria-label={`Lienzo de diseño, ${objetos.length} objeto(s) sobre un área de trabajo de ${areaTrabajoAnchoMm} por ${areaTrabajoAltoMm} milímetros`}
            className="bg-surface relative min-h-0 flex-1 overflow-hidden"
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
                  // #149 -- el pan por drag simple (#107) pasa a requerir
                  // espacio apretado: un plain-drag sobre área vacía ahora
                  // es el marquee de selección (ver `iniciarMarquee`), y
                  // arrastrar un objeto sigue funcionando igual porque cada
                  // uno tiene su propio `draggable`, independiente del
                  // `Stage`.
                  draggable={espacioPresionado}
                  style={{ cursor: espacioPresionado ? "grab" : "default" }}
                  onWheel={alHacerScroll}
                  onDragMove={(e) => {
                    if (e.target.getStage() !== e.target) return;
                    setPanX(e.target.x());
                    setPanY(e.target.y());
                  }}
                  onMouseDown={iniciarMarquee}
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
                        seleccionado={seleccionadosIds.includes(objeto.id)}
                        excedeArea={objetoExcedeArea(
                          objeto,
                          areaTrabajoAnchoMm,
                          areaTrabajoAltoMm,
                        )}
                        vistaToolpath={vistaToolpath}
                        color={colorSeleccionDe(objeto)}
                        onSeleccionar={(aditivo) =>
                          seleccionarObjeto(objeto.id, aditivo)
                        }
                        onMover={(xMm, yMm) =>
                          moverOTransformarObjeto(
                            objeto.id,
                            () => ({ xMm, yMm }),
                            { propagarAlGrupo: true },
                          )
                        }
                        onTransformar={(cambios) =>
                          moverOTransformarObjeto(objeto.id, () => cambios)
                        }
                        registrarNodo={(nodo) => {
                          if (nodo) nodosRef.current.set(objeto.id, nodo);
                          else nodosRef.current.delete(objeto.id);
                        }}
                      />
                    ))}
                    {marquee ? (
                      <Rect
                        x={Math.min(marquee.inicioXPx, marquee.actualXPx)}
                        y={Math.min(marquee.inicioYPx, marquee.actualYPx)}
                        width={Math.abs(marquee.actualXPx - marquee.inicioXPx)}
                        height={Math.abs(marquee.actualYPx - marquee.inicioYPx)}
                        fill="rgba(36,107,206,0.08)"
                        stroke="#246bce"
                        strokeWidth={1}
                        dash={[4, 4]}
                        listening={false}
                      />
                    ) : null}
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

                {limitesSeleccion
                  ? (() => {
                      const limites = limitesSeleccion;
                      const centroXMm = (limites.minXMm + limites.maxXMm) / 2;
                      return (
                        <BarraAccionesObjeto
                          xPx={xMmAPantalla(centroXMm, vista)}
                          yPx={yMmAPantalla(limites.maxYMm, vista) - 8}
                          onEspejarHorizontal={() =>
                            espejarObjetos(seleccionadosIds, "horizontal")
                          }
                          onEspejarVertical={() =>
                            espejarObjetos(seleccionadosIds, "vertical")
                          }
                          onDuplicar={() => duplicarObjetos(seleccionadosIds)}
                          onEliminar={() => eliminarObjetos(seleccionadosIds)}
                        />
                      );
                    })()
                  : null}
              </>
            ) : (
              <div className="bg-navy-soft flex h-full items-center justify-center text-sm">
                Cargando lienzo…
              </div>
            )}
          </div>

          <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2">
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
              {/* Issue #183: antes era un link de texto -- ahora un ícono
               * (lupa + cuadrado, patrón estándar de "encuadrar a la vista
               * completa" en herramientas CAD/diseño), consistente con los
               * botones de zoom de al lado (tampoco son texto). Misma
               * `restablecerVista()`, sin cambios de lógica. */}
              <button
                type="button"
                onClick={restablecerVista}
                aria-label="Restablecer vista"
                title="Restablecer vista (encuadrar el área de trabajo completa)"
                className={iconButtonClasses()}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="9" height="9" rx="1" />
                  <circle cx="16" cy="16" r="5" />
                  <line x1="19.5" y1="19.5" x2="22" y2="22" />
                </svg>
              </button>
              {/* #149 -- el drag simple sobre área vacía pasa a ser el
               * marquee de selección; mantener espacio apretado es la forma
               * de desplazar el lienzo ahora. */}
              <span className="text-text-muted hidden px-1.5 text-xs sm:inline">
                Mantené <kbd className="font-mono">espacio</kbd> y arrastrá para
                desplazar el lienzo.
              </span>
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
        </div>

        {seleccionados.length > 0 ? (
          <div className="border-border bg-surface w-80 shrink-0 overflow-y-auto border-l p-4">
            {seleccionadoUnico ? (
              <PanelObjeto
                objeto={seleccionadoUnico}
                excedeArea={objetoExcedeArea(
                  seleccionadoUnico,
                  areaTrabajoAnchoMm,
                  areaTrabajoAltoMm,
                )}
                onCambiar={(cambios) =>
                  moverOTransformarObjeto(seleccionadoUnico.id, () => cambios)
                }
                onEliminar={() => eliminarObjetos([seleccionadoUnico.id])}
                onGenerarToolpath={(operacion) =>
                  generarToolpath(seleccionadoUnico.id, operacion)
                }
                onCambiarPreprocesamiento={(preprocesamiento) =>
                  cambiarPreprocesamiento(
                    seleccionadoUnico.id,
                    preprocesamiento,
                  )
                }
                modoProduccion={modoProduccion}
                onSalirDeProduccion={() => setModoProduccion(false)}
                fichas={fichas}
                cargandoFichas={cargandoFichas}
                errorFichas={errorFichas}
                onGenerarContorno={(margenMm) =>
                  generarContornoCorte(seleccionadoUnico.id, margenMm)
                }
                generandoContorno={generandoContorno}
                errorContorno={errorContorno}
              />
            ) : (
              // #149 -- selección múltiple (siempre >1 acá: el wrapper de
              // afuera ya garantiza seleccionados.length > 0, y este branch
              // es "no seleccionadoUnico"). El panel numérico de un solo
              // objeto (posición/rotación/velocidad/potencia/Fichas) no tiene
              // un significado obvio cuando hay varios con valores distintos
              // -- se muestra solo el conteo y las mismas acciones en lote que
              // ya ofrece `BarraAccionesObjeto` flotante sobre el lienzo,
              // decisión documentada en el ticket. Mover/rotar/escalar el
              // grupo sigue disponible con el mouse vía el Transformer.
              <div className="flex flex-col gap-4">
                <p className="text-navy text-sm font-semibold">
                  {seleccionados.length} objetos seleccionados
                </p>
                <p className="text-text-muted text-xs">
                  Seleccioná uno solo (click sin Shift) para editar su posición,
                  rotación o parámetros de velocidad/potencia.
                </p>
                <ul className="flex flex-col gap-1">
                  {seleccionados.map((o) => (
                    <li
                      key={o.id}
                      className="text-navy truncate text-xs"
                      title={o.nombre}
                    >
                      {o.nombre}
                    </li>
                  ))}
                </ul>
                <div className="border-border flex flex-col gap-1.5 border-t pt-3">
                  <Button
                    variant="outline"
                    onClick={() => duplicarObjetos(seleccionadosIds)}
                  >
                    Duplicar selección
                  </Button>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        espejarObjetos(seleccionadosIds, "horizontal")
                      }
                    >
                      Espejar horizontal
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        espejarObjetos(seleccionadosIds, "vertical")
                      }
                    >
                      Espejar vertical
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => eliminarObjetos(seleccionadosIds)}
                  >
                    Eliminar selección
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendienteEliminar !== null}
        title="Eliminar también el contorno vinculado"
        description={
          pendienteEliminar
            ? `${
                pendienteEliminar.ids.length === 1
                  ? `"${objetos.find((o) => o.id === pendienteEliminar.ids[0])?.nombre ?? ""}" tiene`
                  : "Lo que estás por eliminar tiene"
              } ${pendienteEliminar.vinculados.length === 1 ? "un contorno de corte generado a partir de una imagen" : `${pendienteEliminar.vinculados.length} contornos de corte generados a partir de una imagen`}. Si lo eliminás sin borrar también el contorno, va a quedar suelto en el lienzo sin corresponder a ninguna imagen -- riesgo real de exportar un G-code que corta en el lugar equivocado.`
            : ""
        }
        confirmLabel="Eliminar ambos"
        onConfirm={confirmarEliminarConVinculados}
        onCancel={() => setPendienteEliminar(null)}
      />
    </div>
  );
}
