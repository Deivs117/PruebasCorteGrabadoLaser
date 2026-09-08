"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Layer, Rect, Stage } from "react-konva";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { iconButtonClasses } from "@/lib/button-styles";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { ObjetoLienzoKonva } from "@/components/editor/objeto-lienzo-konva";
import { PanelObjeto } from "@/components/editor/panel-objeto";
import { SubirObjetoDropzone } from "@/components/editor/subir-objeto-dropzone";
import { objetoExcedeArea } from "@/lib/editor-area";
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
 * exportar` -- espejo de `ObjetoExportarBody` en `apps/api/main.py`. */
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

/**
 * Lienzo interactivo de "Editor de Diseño" (#3/#16): subir, arrastrar,
 * posicionar y rotar varios objetos (SVG y/o imágenes raster) sobre el área
 * de trabajo real de la máquina, con preview de toolpath por objeto y
 * exportación final a un G-code combinado (`/api/editor/exportar`, cierre
 * de #15/#16 -- la conversión real corre en `apps/api`, reusando el motor
 * de rotación de `laser_toolkit.svg.transform`/`laser_toolkit.raster`).
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
  const [anchoPx, setAnchoPx] = useState(600);
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
      if (ancho) setAnchoPx(ancho);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const pxPorMm = anchoPx / areaTrabajoAnchoMm;
  const altoPx = areaTrabajoAltoMm * pxPorMm;

  const seleccionado = objetos.find((o) => o.id === seleccionadoId) ?? null;

  const objetosFueraDeArea = useMemo(
    () =>
      objetos.filter((o) =>
        objetoExcedeArea(o, areaTrabajoAnchoMm, areaTrabajoAltoMm),
      ),
    [objetos, areaTrabajoAnchoMm, areaTrabajoAltoMm],
  );

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
            className="bg-surface border-border overflow-hidden rounded-[var(--radius-md)] border"
          >
            {montado ? (
              <Stage
                width={anchoPx}
                height={altoPx}
                onMouseDown={(e) => {
                  if (e.target === e.target.getStage()) setSeleccionadoId(null);
                }}
              >
                <Layer>
                  <Rect
                    x={0}
                    y={0}
                    width={anchoPx}
                    height={altoPx}
                    fill="#ffffff"
                    stroke="#e2e8f0"
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
                      onSeleccionar={() => setSeleccionadoId(objeto.id)}
                      onMover={(xMm, yMm) =>
                        actualizarCampos(objeto.id, { xMm, yMm })
                      }
                    />
                  ))}
                </Layer>
              </Stage>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vistaToolpath}
                onChange={(e) => setVistaToolpath(e.target.checked)}
                className="accent-blue size-4"
              />
              <span className="text-navy">Ver toolpath generado</span>
            </label>

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
          </div>

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
