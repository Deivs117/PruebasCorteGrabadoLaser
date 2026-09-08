"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { useImagenCargada } from "@/components/editor/usar-imagen-cargada";
import {
  PREPROCESAMIENTO_POR_DEFECTO,
  dibujarPreviewGrabado,
  type CanalRaster,
  type PreprocesamientoRaster,
} from "@/lib/raster-preprocesamiento";

interface ModalPreprocesamientoImagenProps {
  abierto: boolean;
  /** Data URI de la imagen original (misma que terminará en `dataUri` del
   * objeto raster). */
  dataUri: string;
  /** Dimensiones reales del objeto en el lienzo (mm) -- determinan la
   * grilla de muestreo del preview, igual que hace el servidor al
   * exportar (ver `raster-preprocesamiento.ts`). */
  anchoMm: number;
  altoMm: number;
  /** Config de partida -- `PREPROCESAMIENTO_POR_DEFECTO` al subir una
   * imagen nueva, o los valores ya elegidos al reabrir el modal para editar
   * un objeto existente. */
  valorInicial?: PreprocesamientoRaster;
  /** "Agregar al lienzo" al subir una imagen nueva (default); "Aplicar
   * cambios" al reabrir el modal desde el panel de un objeto ya
   * colocado. */
  confirmarLabel?: string;
  onConfirmar: (config: PreprocesamientoRaster) => void;
  onCancelar: () => void;
}

const OPCIONES_CANAL: { valor: CanalRaster; etiqueta: string }[] = [
  { valor: "luminancia", etiqueta: "Luminancia" },
  { valor: "rojo", etiqueta: "Rojo" },
  { valor: "verde", etiqueta: "Verde" },
  { valor: "azul", etiqueta: "Azul" },
  { valor: "mezcla", etiqueta: "Mezcla (pesos por canal)" },
];

/** Lado más largo del recuadro de preview, en px -- solo afecta la
 * resolución de despliegue, no la grilla de muestreo real (esa depende de
 * `anchoMm`/`altoMm`, ver `tamanoGrilla`). */
const LADO_PREVIEW_PX = 280;

/**
 * Modal de preprocesamiento de imagen para grabado fotorrealista (#109):
 * vista comparativa original vs. preview con canal/gamma/invertir/
 * posterizado aplicados, calculado del lado del cliente (Canvas) siguiendo
 * el mismo pipeline que `laser_toolkit.raster.canal.calcular_matriz_intensidad`
 * (ver `raster-preprocesamiento.ts`). Al confirmar, `onConfirmar` fija estos
 * valores en el objeto del lienzo -- no se vuelven a recalcular hasta que se
 * reabra este modal o se exporte de verdad.
 *
 * Decisión explícita de #109 (no reabrir): sin dithering/tramado -- la
 * modulación continua de potencia ya aprovecha mejor el rango real del
 * láser que simular tonos con puntos, así que este modal no ofrece esa
 * opción.
 */
export function ModalPreprocesamientoImagen({
  abierto,
  dataUri,
  anchoMm,
  altoMm,
  valorInicial,
  confirmarLabel = "Agregar al lienzo",
  onConfirmar,
  onCancelar,
}: ModalPreprocesamientoImagenProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<PreprocesamientoRaster>(
    valorInicial ?? PREPROCESAMIENTO_POR_DEFECTO,
  );
  const imagen = useImagenCargada(dataUri);

  // Reabrir el modal (subir otra imagen, o editar un objeto distinto)
  // arranca siempre de su propio valor inicial, nunca del que dejó la
  // sesión anterior del modal.
  useEffect(() => {
    if (abierto) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(valorInicial ?? PREPROCESAMIENTO_POR_DEFECTO);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, dataUri]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierto && !dialog.open) dialog.showModal();
    if (!abierto && dialog.open) dialog.close();
  }, [abierto]);

  const proporcion = anchoMm / altoMm || 1;
  const anchoPreviewPx =
    proporcion >= 1 ? LADO_PREVIEW_PX : LADO_PREVIEW_PX * proporcion;
  const altoPreviewPx =
    proporcion >= 1 ? LADO_PREVIEW_PX / proporcion : LADO_PREVIEW_PX;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imagen) return;
    dibujarPreviewGrabado(
      ctx,
      imagen,
      anchoMm,
      altoMm,
      config,
      canvas.width,
      canvas.height,
    );
  }, [imagen, anchoMm, altoMm, config]);

  function cambiarCanal(canal: CanalRaster) {
    setConfig((actual) => ({
      ...actual,
      canal,
      // Pesos distintos del default solo tienen sentido con canal="mezcla"
      // -- `ConfiguracionRaster` real del servidor rechaza (400) un objeto
      // con pesos no-default en un canal fijo, así que se resetean acá al
      // salir de "mezcla" en vez de dejar que el usuario mande una
      // combinación que el servidor va a rechazar al exportar.
      ...(canal === "mezcla"
        ? {}
        : {
            pesoRojo: PREPROCESAMIENTO_POR_DEFECTO.pesoRojo,
            pesoVerde: PREPROCESAMIENTO_POR_DEFECTO.pesoVerde,
            pesoAzul: PREPROCESAMIENTO_POR_DEFECTO.pesoAzul,
          }),
    }));
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancelar}
      className="border-border bg-surface backdrop:bg-navy/40 m-auto rounded-[var(--radius-lg)] border p-0 backdrop:backdrop-blur-[1px]"
    >
      <div className="flex w-[42rem] max-w-[95vw] flex-col gap-5 p-6">
        <div>
          <p className="text-navy text-base font-semibold">
            Preprocesamiento de imagen
          </p>
          <p className="text-text-muted text-xs">
            Ajustá cómo se convierte la imagen a intensidad de grabado antes de
            agregarla al lienzo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-text-muted text-xs font-medium uppercase">
              Original
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data
                URI local, no hay optimización de next/image que aplique. */}
            <img
              src={dataUri}
              alt="Imagen original"
              style={{ width: anchoPreviewPx, height: altoPreviewPx }}
              className="border-border rounded-[var(--radius-sm)] border object-contain"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-text-muted text-xs font-medium uppercase">
              Preview de grabado
            </p>
            <canvas
              ref={canvasRef}
              width={Math.round(anchoPreviewPx)}
              height={Math.round(altoPreviewPx)}
              style={{ width: anchoPreviewPx, height: altoPreviewPx }}
              className="border-border rounded-[var(--radius-sm)] border"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Canal">
            {(id) => (
              <select
                id={id}
                value={config.canal}
                onChange={(e) => cambiarCanal(e.target.value as CanalRaster)}
                className={INPUT_CLASSES}
              >
                {OPCIONES_CANAL.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Gamma" hint="1 = sin cambio de contraste.">
            {(id) => (
              <input
                id={id}
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={config.gamma}
                onChange={(e) =>
                  setConfig((actual) => ({
                    ...actual,
                    gamma: Number(e.target.value),
                  }))
                }
                className="accent-blue w-full"
                aria-describedby={undefined}
              />
            )}
          </Field>
        </div>
        <p className="text-navy -mt-2 text-right font-mono text-xs">
          gamma = {config.gamma.toFixed(1)}
        </p>

        {config.canal === "mezcla" ? (
          <div className="border-border grid grid-cols-3 gap-3 border-t pt-3">
            {(
              [
                ["pesoRojo", "Peso rojo"],
                ["pesoVerde", "Peso verde"],
                ["pesoAzul", "Peso azul"],
              ] as const
            ).map(([campo, etiqueta]) => (
              <Field key={campo} label={etiqueta}>
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config[campo]}
                    onChange={(e) =>
                      setConfig((actual) => ({
                        ...actual,
                        [campo]: Math.min(
                          1,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                    className={clsx(INPUT_CLASSES, "font-mono")}
                  />
                )}
              </Field>
            ))}
          </div>
        ) : null}

        <div className="border-border flex flex-col gap-3 border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.invertir}
              onChange={(e) =>
                setConfig((actual) => ({
                  ...actual,
                  invertir: e.target.checked,
                }))
              }
              className="accent-blue size-4"
            />
            <span className="text-navy">
              Invertir (pixel más claro = más potencia)
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.nivelesPosterizado !== null}
              onChange={(e) =>
                setConfig((actual) => ({
                  ...actual,
                  nivelesPosterizado: e.target.checked ? 4 : null,
                }))
              }
              className="accent-blue size-4"
            />
            <span className="text-navy">
              Posterizar (reducir a niveles discretos)
            </span>
          </label>
          {config.nivelesPosterizado !== null ? (
            <Field label="Niveles">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={256}
                  value={config.nivelesPosterizado ?? 2}
                  onChange={(e) =>
                    setConfig((actual) => ({
                      ...actual,
                      nivelesPosterizado: Math.min(
                        256,
                        Math.max(2, Number(e.target.value) || 2),
                      ),
                    }))
                  }
                  className={clsx(INPUT_CLASSES, "w-24 font-mono")}
                />
              )}
            </Field>
          ) : null}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => onConfirmar(config)}>
            {confirmarLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
