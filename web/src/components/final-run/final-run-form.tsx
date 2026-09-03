"use client";

import { useState } from "react";
import { CircleCheck, Flame, Scissors, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { NumberStepper } from "@/components/suites/number-stepper";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import {
  DEFAULTS_FINAL_RUN,
  type FinalRunFormData,
} from "@/lib/final-run-schema";

interface EstadoFormulario {
  operacion: "corte" | "grabado" | null;
  material: string;
  espesorMm: string;
  lote: string;
  velocidadMmMin: string;
  potenciaPct: string;
  pasadas: number;
  repeticiones: number;
  tamanoCeldaMm: number;
  espaciadoMm: number;
}

const ESTADO_INICIAL: EstadoFormulario = {
  operacion: null,
  material: "",
  espesorMm: "",
  lote: DEFAULTS_FINAL_RUN.lote,
  velocidadMmMin: "",
  potenciaPct: "",
  pasadas: DEFAULTS_FINAL_RUN.pasadas,
  repeticiones: DEFAULTS_FINAL_RUN.repeticiones,
  tamanoCeldaMm: DEFAULTS_FINAL_RUN.tamanoCeldaMm,
  espaciadoMm: DEFAULTS_FINAL_RUN.espaciadoMm,
};

type Resultado =
  | { estado: "idle" }
  | { estado: "enviando" }
  | { estado: "ok"; celdas: number; gcodeFileName: string; csvFileName: string }
  | { estado: "error"; mensaje: string };

function puedeEnviar(form: EstadoFormulario): boolean {
  return (
    form.operacion !== null &&
    form.material.trim() !== "" &&
    Number(form.espesorMm) > 0 &&
    form.lote.trim() !== "" &&
    Number(form.velocidadMmMin) > 0 &&
    Number(form.potenciaPct) > 0 &&
    Number(form.potenciaPct) <= 100
  );
}

export function FinalRunForm() {
  const [form, setForm] = useState<EstadoFormulario>(ESTADO_INICIAL);
  const [resultado, setResultado] = useState<Resultado>({ estado: "idle" });

  function actualizar(cambios: Partial<EstadoFormulario>) {
    setForm((anterior) => ({ ...anterior, ...cambios }));
  }

  async function enviar() {
    if (!form.operacion) return;
    setResultado({ estado: "enviando" });

    const datos: FinalRunFormData = {
      operacion: form.operacion,
      material: form.material.trim(),
      espesorMm: Number(form.espesorMm),
      lote: form.lote.trim(),
      velocidadMmMin: Number(form.velocidadMmMin),
      potenciaPct: Number(form.potenciaPct),
      pasadas: form.pasadas,
      repeticiones: form.repeticiones,
      tamanoCeldaMm: form.tamanoCeldaMm,
      espaciadoMm: form.espaciadoMm,
    };

    try {
      const respuesta = await fetch("/api/final-run", {
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
          mensaje: cuerpo.error ?? "No se pudo generar la Final Run.",
        });
      }
    } catch {
      setResultado({
        estado: "error",
        mensaje: "No se pudo conectar con el taller.",
      });
    }
  }

  if (resultado.estado === "ok") {
    return (
      <Card accent="teal" className="flex flex-col items-start gap-4 p-6">
        <span
          className="bg-teal-soft text-teal flex size-12 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <CircleCheck className="size-6" strokeWidth={1.75} />
        </span>
        <div aria-live="polite">
          <p className="text-navy text-base font-semibold">
            Ejecución 1 generada: {resultado.celdas} réplicas listas
          </p>
          <p className="text-text-muted mt-1 text-sm">
            Corré esta ejecución en la máquina, medí el kWh y el tiempo real, y
            completalos en Hoja de Registro. Repetí el proceso al menos 3 veces,
            en momentos independientes, antes de resumir la calibración.
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
          <LinkButton href="/final-run" variant="primary">
            Ir a Final Run
          </LinkButton>
          <LinkButton href="/registro" variant="outline">
            Ir a Hoja de Registro
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-navy text-base font-semibold">
            ¿Qué operación vas a calibrar?
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { valor: "corte" as const, etiqueta: "Corte", icono: Scissors },
              { valor: "grabado" as const, etiqueta: "Grabado", icono: Flame },
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
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Field label="Lote">
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
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <p className="text-navy text-base font-semibold">
          Combinación ya elegida para producción
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Velocidad (mm/min)">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                value={form.velocidadMmMin}
                onChange={(e) => actualizar({ velocidadMmMin: e.target.value })}
                className={clsx(INPUT_CLASSES, "font-mono")}
              />
            )}
          </Field>
          <Field label="Potencia (%)">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={form.potenciaPct}
                onChange={(e) => actualizar({ potenciaPct: e.target.value })}
                className={clsx(INPUT_CLASSES, "font-mono")}
              />
            )}
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <NumberStepper
            label="Pasadas del láser"
            min={1}
            value={form.pasadas}
            onChange={(v) => actualizar({ pasadas: v })}
          />
          <NumberStepper
            label="Réplicas por ejecución"
            hint="Celdas físicamente idénticas dentro de esta corrida."
            min={1}
            value={form.repeticiones}
            onChange={(v) => actualizar({ repeticiones: v })}
          />
        </div>
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
      </Card>

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

      <div>
        <Button
          variant="primary"
          onClick={enviar}
          disabled={!puedeEnviar(form) || resultado.estado === "enviando"}
        >
          {resultado.estado === "enviando"
            ? "Generando…"
            : "Generar ejecución 1"}
        </Button>
      </div>
    </div>
  );
}
