"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { iconButtonClasses } from "@/lib/button-styles";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { ObjetoLienzoKonva } from "@/components/editor/objeto-lienzo-konva";
import { PanelObjeto } from "@/components/editor/panel-objeto";
import { SubirObjetoDropzone } from "@/components/editor/subir-objeto-dropzone";
import { objetoExcedeArea } from "@/lib/editor-area";
import { conversionSvgSchema, type ModoGrabadoSvg } from "@/lib/svg-schema";
import type {
  EstadoToolpath,
  ObjetoLienzo,
  Operacion,
} from "@/lib/editor-tipos";

interface EditorLienzoProps {
  areaTrabajoAnchoMm: number;
  areaTrabajoAltoMm: number;
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
 * de trabajo real de la máquina, con preview de toolpath por objeto.
 *
 * Deliberadamente NO incluye el export combinado a un solo G-code todavía
 * — el motor de conversión no soporta rotación real de coordenadas hasta
 * que se sincronice con la rama de backend de #15/#16 (ver el botón
 * deshabilitado al final). Ver la nota técnica sobre rotación en los
 * comentarios de #15 y #16 en GitHub.
 */
export function EditorLienzo({
  areaTrabajoAnchoMm,
  areaTrabajoAltoMm,
}: EditorLienzoProps) {
  const [montado, setMontado] = useState(false);
  const [objetos, setObjetos] = useState<ObjetoLienzo[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [vistaToolpath, setVistaToolpath] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [anchoPx, setAnchoPx] = useState(600);

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
              disabled
              title="Pendiente de sincronizar con feature/backend (#15/#16)"
            >
              Exportar G-code combinado
            </Button>
            <p className="text-text-muted text-xs">
              Todavía no disponible: el motor de conversión no soporta rotación
              real de coordenadas — este botón se activa cuando la rama de
              backend de rotación (#15/#16) se mergee.
            </p>
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
