"use client";

import { useState } from "react";
import {
  CircleCheck,
  Flame,
  Scissors,
  Shapes,
  Square,
  TriangleAlert,
} from "lucide-react";
import { clsx } from "clsx";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { Reveal } from "@/components/ui/reveal";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { GridPreview } from "@/components/suites/grid-preview";
import { NumberChipsInput } from "@/components/suites/number-chips-input";
import { NumberStepper } from "@/components/suites/number-stepper";
import { SvgPicker } from "@/components/suites/svg-picker";
import { WizardStepper } from "@/components/suites/wizard-stepper";
import { totalCeldas, type SuiteFormData } from "@/lib/suite-schema";

const PASOS = [
  "Operación",
  "Material",
  "Barrido",
  "Grilla",
  "Geometría",
  "Resumen",
];

type ModoGrabadoSvg = "contorno" | "relleno" | "contorno_y_relleno";

interface EstadoFormulario {
  operacion: "corte" | "grabado" | null;
  material: string;
  espesorMm: string;
  lote: string;
  velocidadesMmMin: number[];
  potenciasPct: number[];
  pasadas: number;
  tamanoCeldaMm: number;
  espaciadoMm: number;
  geometria: "generica" | "svg";
  svgPath: string;
  modoGrabadoSvg: ModoGrabadoSvg;
  svgResolucionRellenoMm: number;
}

const ESTADO_INICIAL: EstadoFormulario = {
  operacion: null,
  material: "",
  espesorMm: "",
  lote: "L01",
  velocidadesMmMin: [],
  potenciasPct: [],
  pasadas: 1,
  tamanoCeldaMm: 15,
  espaciadoMm: 5,
  geometria: "generica",
  svgPath: "",
  modoGrabadoSvg: "contorno_y_relleno",
  svgResolucionRellenoMm: 0.3,
};

function desdeDatosIniciales(datos: SuiteFormData): EstadoFormulario {
  return {
    ...datos,
    espesorMm: String(datos.espesorMm),
    geometria: datos.svgPath ? "svg" : "generica",
    svgPath: datos.svgPath ?? "",
    modoGrabadoSvg: datos.modoGrabadoSvg ?? "contorno_y_relleno",
    svgResolucionRellenoMm: datos.svgResolucionRellenoMm ?? 0.3,
  };
}

type ResultadoEnvio =
  | { estado: "idle" }
  | { estado: "enviando" }
  | {
      estado: "ok";
      celdas: number;
      gcodeFileName: string;
      csvFileName: string;
    }
  | { estado: "error"; mensaje: string };

function puedeAvanzar(paso: number, form: EstadoFormulario): boolean {
  switch (paso) {
    case 0:
      return form.operacion !== null;
    case 1:
      return (
        form.material.trim() !== "" &&
        Number(form.espesorMm) > 0 &&
        form.lote.trim() !== ""
      );
    case 2:
      return form.velocidadesMmMin.length > 0 && form.potenciasPct.length > 0;
    case 3:
      return form.tamanoCeldaMm > 0 && form.espaciadoMm >= 0;
    case 4:
      return form.geometria === "generica" || form.svgPath !== "";
    default:
      return true;
  }
}

interface SvgDisponible {
  nombre: string;
  contenido: string;
}

interface SuiteWizardProps {
  /** Si se pasa, el asistente edita esa suite en vez de crear una nueva:
   * guarda sobre el mismo archivo y regenera su G-code. */
  archivoExistente?: string;
  datosIniciales?: SuiteFormData;
  svgsDisponibles: SvgDisponible[];
}

export function SuiteWizard({
  archivoExistente,
  datosIniciales,
  svgsDisponibles,
}: SuiteWizardProps) {
  const modoEdicion = archivoExistente !== undefined;
  const [paso, setPaso] = useState(0);
  const [form, setForm] = useState<EstadoFormulario>(
    datosIniciales ? desdeDatosIniciales(datosIniciales) : ESTADO_INICIAL,
  );
  const [resultado, setResultado] = useState<ResultadoEnvio>({
    estado: "idle",
  });

  function actualizar(cambios: Partial<EstadoFormulario>) {
    setForm((anterior) => ({ ...anterior, ...cambios }));
  }

  async function generar() {
    if (!form.operacion) return;
    setResultado({ estado: "enviando" });

    const usaSvg = form.geometria === "svg" && form.svgPath !== "";
    const datos: SuiteFormData = {
      operacion: form.operacion,
      material: form.material.trim(),
      espesorMm: Number(form.espesorMm),
      lote: form.lote.trim(),
      velocidadesMmMin: form.velocidadesMmMin,
      potenciasPct: form.potenciasPct,
      pasadas: form.pasadas,
      tamanoCeldaMm: form.tamanoCeldaMm,
      espaciadoMm: form.espaciadoMm,
      svgPath: usaSvg ? form.svgPath : undefined,
      modoGrabadoSvg:
        usaSvg && form.operacion === "grabado"
          ? form.modoGrabadoSvg
          : undefined,
      svgResolucionRellenoMm:
        usaSvg &&
        form.operacion === "grabado" &&
        form.modoGrabadoSvg !== "contorno"
          ? form.svgResolucionRellenoMm
          : undefined,
    };

    try {
      const respuesta = await fetch(
        modoEdicion
          ? `/api/suites/${encodeURIComponent(archivoExistente)}`
          : "/api/suites",
        {
          method: modoEdicion ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        celdas?: number;
        gcodeFileName?: string;
        csvFileName?: string;
        error?: string;
      };

      if (
        cuerpo.ok &&
        cuerpo.celdas &&
        cuerpo.gcodeFileName &&
        cuerpo.csvFileName
      ) {
        setResultado({
          estado: "ok",
          celdas: cuerpo.celdas,
          gcodeFileName: cuerpo.gcodeFileName,
          csvFileName: cuerpo.csvFileName,
        });
      } else {
        setResultado({
          estado: "error",
          mensaje: cuerpo.error ?? "No se pudo generar la suite.",
        });
      }
    } catch {
      setResultado({
        estado: "error",
        mensaje: "No se pudo conectar con el taller para generar la suite.",
      });
    }
  }

  if (resultado.estado === "ok") {
    return (
      <Reveal>
        <Card accent="teal" className="flex flex-col items-start gap-4 p-6">
          <span
            className="bg-teal-soft text-teal flex size-12 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <CircleCheck className="size-6" strokeWidth={1.75} />
          </span>
          <div aria-live="polite">
            <p className="text-navy text-base font-semibold">
              {modoEdicion ? "Cambios guardados" : "Suite generada"}:{" "}
              {resultado.celdas} celdas listas
            </p>
            <p className="text-text-muted mt-1 text-sm">
              El G-code y su registro de datos ya quedaron{" "}
              {modoEdicion ? "regenerados" : "guardados"} en el sistema, listos
              para correr en la máquina. Si además querés una copia en otra
              carpeta, descargala acá:
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <DescargarBoton
              archivo={resultado.gcodeFileName}
              etiqueta="Descargar G-code"
              variant="secondary"
            />
            <DescargarBoton
              archivo={resultado.csvFileName}
              etiqueta="Descargar CSV"
              variant="outline"
            />
          </div>
          <div className="flex gap-3">
            {modoEdicion ? (
              <LinkButton href="/suites" variant="primary">
                Volver a Suites de Prueba
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/registro" variant="primary">
                  Ir a Hoja de Registro
                </LinkButton>
                <Button
                  variant="outline"
                  onClick={() => {
                    setForm(ESTADO_INICIAL);
                    setPaso(0);
                    setResultado({ estado: "idle" });
                  }}
                >
                  Configurar otra suite
                </Button>
              </>
            )}
          </div>
        </Card>
      </Reveal>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardStepper
        pasos={PASOS}
        actual={paso}
        onSeleccionar={datosIniciales ? setPaso : undefined}
      />

      <Reveal key={paso}>
        <Card className="p-6">
          {paso === 0 ? (
            <fieldset className="flex flex-col gap-4">
              <legend className="text-navy text-base font-semibold">
                ¿Qué operación vas a probar?
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    valor: "corte" as const,
                    etiqueta: "Corte",
                    icono: Scissors,
                  },
                  {
                    valor: "grabado" as const,
                    etiqueta: "Grabado",
                    icono: Flame,
                  },
                ].map(({ valor, etiqueta, icono: Icono }) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => actualizar({ operacion: valor })}
                    aria-pressed={form.operacion === valor}
                    className={clsx(
                      "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border p-6 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                      form.operacion === valor
                        ? "border-blue bg-blue-soft"
                        : "border-border hover:bg-navy-soft",
                    )}
                  >
                    <Icono className="text-navy size-6" strokeWidth={1.75} />
                    <span className="text-navy text-sm font-medium">
                      {etiqueta}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {paso === 1 ? (
            <div className="flex flex-col gap-4">
              <Field label="Material">
                {(id) => (
                  <input
                    id={id}
                    type="text"
                    value={form.material}
                    onChange={(e) => actualizar({ material: e.target.value })}
                    placeholder="Ej. MDF Trupan"
                    className={INPUT_CLASSES}
                  />
                )}
              </Field>
              <Field label="Espesor (mm)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={form.espesorMm}
                    onChange={(e) => actualizar({ espesorMm: e.target.value })}
                    className={clsx(INPUT_CLASSES, "font-mono")}
                  />
                )}
              </Field>
              <Field
                label="Lote"
                hint="Agrupa esta corrida con las demás pruebas del mismo lote de trabajo."
              >
                {(id) => (
                  <input
                    id={id}
                    type="text"
                    value={form.lote}
                    onChange={(e) => actualizar({ lote: e.target.value })}
                    className={INPUT_CLASSES}
                  />
                )}
              </Field>
            </div>
          ) : null}

          {paso === 2 ? (
            <div className="flex flex-col gap-5">
              <NumberChipsInput
                label="Velocidades a probar"
                unit=" mm/min"
                min={1}
                values={form.velocidadesMmMin}
                onChange={(v) => actualizar({ velocidadesMmMin: v })}
              />
              <NumberChipsInput
                label="Potencias a probar"
                unit="%"
                min={1}
                max={100}
                values={form.potenciasPct}
                onChange={(v) => actualizar({ potenciasPct: v })}
              />
              <NumberStepper
                label="Pasadas del láser"
                hint="Cuántas veces repite el láser cada celda."
                min={1}
                value={form.pasadas}
                onChange={(v) => actualizar({ pasadas: v })}
              />
            </div>
          ) : null}

          {paso === 3 ? (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tamaño de celda (mm)">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      value={form.tamanoCeldaMm}
                      onChange={(e) =>
                        actualizar({ tamanoCeldaMm: Number(e.target.value) })
                      }
                      className={clsx(INPUT_CLASSES, "font-mono")}
                    />
                  )}
                </Field>
                <Field label="Espaciado entre celdas (mm)">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      value={form.espaciadoMm}
                      onChange={(e) =>
                        actualizar({ espaciadoMm: Number(e.target.value) })
                      }
                      className={clsx(INPUT_CLASSES, "font-mono")}
                    />
                  )}
                </Field>
              </div>
              <GridPreview
                velocidadesMmMin={form.velocidadesMmMin}
                potenciasPct={form.potenciasPct}
              />
            </div>
          ) : null}

          {paso === 4 ? (
            <div className="flex flex-col gap-5">
              <fieldset className="flex flex-col gap-3">
                <legend className="text-navy text-base font-semibold">
                  ¿Qué se {form.operacion === "corte" ? "corta" : "graba"} en
                  cada celda?
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => actualizar({ geometria: "generica" })}
                    aria-pressed={form.geometria === "generica"}
                    className={clsx(
                      "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border p-6 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                      form.geometria === "generica"
                        ? "border-blue bg-blue-soft"
                        : "border-border hover:bg-navy-soft",
                    )}
                  >
                    <Square className="text-navy size-6" strokeWidth={1.75} />
                    <span className="text-navy text-sm font-medium">
                      Cuadrado genérico
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => actualizar({ geometria: "svg" })}
                    aria-pressed={form.geometria === "svg"}
                    className={clsx(
                      "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border p-6 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                      form.geometria === "svg"
                        ? "border-blue bg-blue-soft"
                        : "border-border hover:bg-navy-soft",
                    )}
                  >
                    <Shapes className="text-navy size-6" strokeWidth={1.75} />
                    <span className="text-navy text-sm font-medium">
                      Importar SVG
                    </span>
                  </button>
                </div>
              </fieldset>

              {form.geometria === "svg" ? (
                <div className="flex flex-col gap-4">
                  <p className="text-text-muted text-sm">
                    El SVG se escala para caber dentro de {form.tamanoCeldaMm}mm
                    (el tamaño de celda del paso anterior), proporción
                    preservada y centrado.
                  </p>
                  <SvgPicker
                    disponibles={svgsDisponibles}
                    seleccionado={form.svgPath}
                    onSeleccionar={(nombre) => actualizar({ svgPath: nombre })}
                  />

                  {form.operacion === "corte" ? (
                    <p className="border-border bg-navy-soft text-text-muted rounded-[var(--radius-sm)] border p-3 text-sm">
                      Corte siempre traza solo el contorno del SVG, repetido
                      según las pasadas configuradas — cortar no admite relleno
                      tipo trama.
                    </p>
                  ) : (
                    <>
                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-navy text-sm font-medium">
                          Modo de grabado
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              valor: "contorno" as const,
                              etiqueta: "Contorno",
                            },
                            { valor: "relleno" as const, etiqueta: "Relleno" },
                            {
                              valor: "contorno_y_relleno" as const,
                              etiqueta: "Contorno y relleno",
                            },
                          ].map((opcion) => (
                            <button
                              key={opcion.valor}
                              type="button"
                              onClick={() =>
                                actualizar({ modoGrabadoSvg: opcion.valor })
                              }
                              aria-pressed={
                                form.modoGrabadoSvg === opcion.valor
                              }
                              className={clsx(
                                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                                form.modoGrabadoSvg === opcion.valor
                                  ? "border-blue bg-blue-soft text-navy"
                                  : "border-border text-text-muted hover:bg-navy-soft",
                              )}
                            >
                              {opcion.etiqueta}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      {form.modoGrabadoSvg !== "contorno" ? (
                        <Field
                          label="Resolución de relleno (mm)"
                          hint="Espaciado entre líneas del relleno — más chico es más denso y más lento."
                        >
                          {(id) => (
                            <input
                              id={id}
                              type="number"
                              inputMode="decimal"
                              min={0.05}
                              step="0.05"
                              value={form.svgResolucionRellenoMm}
                              onChange={(e) =>
                                actualizar({
                                  svgResolucionRellenoMm: Number(
                                    e.target.value,
                                  ),
                                })
                              }
                              className={clsx(INPUT_CLASSES, "w-40 font-mono")}
                            />
                          )}
                        </Field>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {paso === 5 ? (
            <div className="flex flex-col gap-4">
              <p className="text-navy text-base font-semibold">
                {totalCeldas(form)} celdas en total
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-text-muted">Operación</dt>
                  <dd className="text-navy font-medium capitalize">
                    {form.operacion}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Material</dt>
                  <dd className="text-navy font-medium">
                    {form.material} · {form.espesorMm}mm
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Lote</dt>
                  <dd className="text-navy font-mono font-medium">
                    {form.lote}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Velocidades</dt>
                  <dd className="text-navy font-mono font-medium">
                    {form.velocidadesMmMin.join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Potencias</dt>
                  <dd className="text-navy font-mono font-medium">
                    {form.potenciasPct.join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Pasadas</dt>
                  <dd className="text-navy font-mono font-medium">
                    {form.pasadas}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Geometría</dt>
                  <dd className="text-navy font-medium">
                    {form.geometria === "svg"
                      ? svgsDisponibles.find(
                          (s) => `data/svgs/${s.nombre}` === form.svgPath,
                        )
                        ? "SVG importado"
                        : form.svgPath.split("/").pop()
                      : "Cuadrado genérico"}
                  </dd>
                </div>
              </dl>

              {resultado.estado === "error" ? (
                <div
                  aria-live="polite"
                  className="border-orange/30 bg-orange-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-3"
                >
                  <TriangleAlert
                    className="text-orange mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-navy text-sm">{resultado.mensaje}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </Reveal>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setPaso((p) => Math.max(0, p - 1))}
          disabled={paso === 0 || resultado.estado === "enviando"}
        >
          Atrás
        </Button>
        {paso < PASOS.length - 1 ? (
          <Button
            variant="primary"
            onClick={() => setPaso((p) => p + 1)}
            disabled={!puedeAvanzar(paso, form)}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={generar}
            disabled={resultado.estado === "enviando"}
          >
            {resultado.estado === "enviando"
              ? modoEdicion
                ? "Guardando…"
                : "Generando…"
              : modoEdicion
                ? "Guardar cambios"
                : "Generar"}
          </Button>
        )}
      </div>
    </div>
  );
}
