"use client";

import { useState } from "react";
import { CircleCheck, Flame, Scissors, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { Reveal } from "@/components/ui/reveal";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { GridPreview } from "@/components/suites/grid-preview";
import { NumberChipsInput } from "@/components/suites/number-chips-input";
import { NumberStepper } from "@/components/suites/number-stepper";
import { WizardStepper } from "@/components/suites/wizard-stepper";
import { totalCeldas, type SuiteFormData } from "@/lib/suite-schema";

const PASOS = ["Operación", "Material", "Barrido", "Grilla", "Resumen"];

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
};

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
    default:
      return true;
  }
}

export function SuiteWizard() {
  const [paso, setPaso] = useState(0);
  const [form, setForm] = useState<EstadoFormulario>(ESTADO_INICIAL);
  const [resultado, setResultado] = useState<ResultadoEnvio>({
    estado: "idle",
  });

  function actualizar(cambios: Partial<EstadoFormulario>) {
    setForm((anterior) => ({ ...anterior, ...cambios }));
  }

  async function generar() {
    if (!form.operacion) return;
    setResultado({ estado: "enviando" });

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
    };

    try {
      const respuesta = await fetch("/api/suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
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
              Suite generada: {resultado.celdas} celdas listas
            </p>
            <p className="text-text-muted mt-1 text-sm">
              El G-code y su registro de datos ya quedaron guardados en el
              sistema, listos para correr en la máquina. Si además querés una
              copia en otra carpeta, descargala acá:
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
          </div>
        </Card>
      </Reveal>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardStepper pasos={PASOS} actual={paso} />

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
              </dl>

              {form.operacion === "grabado" ? (
                <p className="border-border bg-navy-soft text-text-muted rounded-[var(--radius-sm)] border p-3 text-sm">
                  Esta suite va a grabar un relleno genérico (cuadrado sólido)
                  en cada celda. Importar un diseño propio va a estar disponible
                  en Grabado Vectorial (SVG).
                </p>
              ) : null}

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
            {resultado.estado === "enviando" ? "Generando…" : "Generar"}
          </Button>
        )}
      </div>
    </div>
  );
}
