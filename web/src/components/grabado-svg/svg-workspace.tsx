"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { DescargarBoton } from "@/components/registro/descargar-boton";
import { SvgOriginalPreview } from "@/components/grabado-svg/svg-original-preview";
import { ToolpathPreview } from "@/components/grabado-svg/toolpath-preview";
import {
  DEFAULTS_CONVERSION_SVG,
  type ConversionSvgData,
  type ModoGrabadoSvg,
} from "@/lib/svg-schema";

interface SvgWorkspaceProps {
  nombre: string;
  contenidoSvg: string;
}

interface EstadoFormulario {
  anchoMm: string;
  altoMm: string;
  velocidadMmMin: string;
  potenciaPct: string;
  modo: ModoGrabadoSvg;
  resolucionRellenoMm: string;
}

const ESTADO_INICIAL: EstadoFormulario = {
  anchoMm: String(DEFAULTS_CONVERSION_SVG.anchoMm),
  altoMm: String(DEFAULTS_CONVERSION_SVG.altoMm),
  velocidadMmMin: String(DEFAULTS_CONVERSION_SVG.velocidadMmMin),
  potenciaPct: String(DEFAULTS_CONVERSION_SVG.potenciaPct),
  modo: DEFAULTS_CONVERSION_SVG.modo,
  resolucionRellenoMm: String(DEFAULTS_CONVERSION_SVG.resolucionRellenoMm),
};

const OPCIONES_MODO: { valor: ModoGrabadoSvg; etiqueta: string }[] = [
  { valor: "contorno", etiqueta: "Contorno" },
  { valor: "relleno", etiqueta: "Relleno" },
  { valor: "contorno_y_relleno", etiqueta: "Contorno y relleno" },
];

type Resultado =
  | { estado: "idle" }
  | { estado: "generando" }
  | { estado: "ok"; gcode: string; archivoGcode: string }
  | { estado: "error"; mensaje: string };

export function SvgWorkspace({ nombre, contenidoSvg }: SvgWorkspaceProps) {
  const [form, setForm] = useState<EstadoFormulario>(ESTADO_INICIAL);
  const [resultado, setResultado] = useState<Resultado>({ estado: "idle" });

  function actualizar(cambios: Partial<EstadoFormulario>) {
    setForm((anterior) => ({ ...anterior, ...cambios }));
  }

  async function generarVistaPrevia() {
    setResultado({ estado: "generando" });

    const datos: ConversionSvgData = {
      anchoMm: Number(form.anchoMm),
      altoMm: Number(form.altoMm),
      velocidadMmMin: Number(form.velocidadMmMin),
      potenciaPct: Number(form.potenciaPct),
      modo: form.modo,
      resolucionRellenoMm: Number(form.resolucionRellenoMm),
    };

    try {
      const respuesta = await fetch(
        `/api/svgs/${encodeURIComponent(nombre)}/convertir`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        gcode?: string;
        archivoGcode?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.gcode && cuerpo.archivoGcode) {
        setResultado({
          estado: "ok",
          gcode: cuerpo.gcode,
          archivoGcode: cuerpo.archivoGcode,
        });
      } else {
        setResultado({
          estado: "error",
          mensaje: cuerpo.error ?? "No se pudo convertir el SVG.",
        });
      }
    } catch {
      setResultado({
        estado: "error",
        mensaje: "No se pudo conectar con el taller.",
      });
    }
  }

  const anchoMmNumero = Number(form.anchoMm) || DEFAULTS_CONVERSION_SVG.anchoMm;
  const altoMmNumero = Number(form.altoMm) || DEFAULTS_CONVERSION_SVG.altoMm;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-navy text-sm font-semibold">SVG original</p>
          <SvgOriginalPreview contenido={contenidoSvg} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-navy text-sm font-semibold">Toolpath resultante</p>
          {resultado.estado === "ok" ? (
            <ToolpathPreview
              gcode={resultado.gcode}
              anchoMm={anchoMmNumero}
              altoMm={altoMmNumero}
            />
          ) : (
            <div className="bg-navy-soft text-text-muted border-border flex aspect-square items-center justify-center rounded-[var(--radius-md)] border border-dashed p-4 text-center text-sm">
              {resultado.estado === "generando"
                ? "Generando…"
                : "Ajustá los parámetros y generá la vista previa."}
            </div>
          )}
        </div>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Ancho (mm)">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={form.anchoMm}
                onChange={(e) => actualizar({ anchoMm: e.target.value })}
                className={clsx(INPUT_CLASSES, "font-mono")}
              />
            )}
          </Field>
          <Field label="Alto (mm)">
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={form.altoMm}
                onChange={(e) => actualizar({ altoMm: e.target.value })}
                className={clsx(INPUT_CLASSES, "font-mono")}
              />
            )}
          </Field>
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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-navy text-sm font-medium">
            Modo de grabado
          </legend>
          <div className="flex flex-wrap gap-2">
            {OPCIONES_MODO.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => actualizar({ modo: opcion.valor })}
                aria-pressed={form.modo === opcion.valor}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                  form.modo === opcion.valor
                    ? "border-blue bg-blue-soft text-navy"
                    : "border-border text-text-muted hover:bg-navy-soft",
                )}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </fieldset>

        {form.modo !== "contorno" ? (
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
                value={form.resolucionRellenoMm}
                onChange={(e) =>
                  actualizar({ resolucionRellenoMm: e.target.value })
                }
                className={clsx(INPUT_CLASSES, "w-40 font-mono")}
              />
            )}
          </Field>
        ) : null}
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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={generarVistaPrevia}
          loading={resultado.estado === "generando"}
        >
          {resultado.estado === "generando"
            ? "Generando…"
            : "Generar vista previa"}
        </Button>
        {resultado.estado === "ok" ? (
          <DescargarBoton
            archivo={resultado.archivoGcode}
            etiqueta="Descargar G-code"
            endpointBase="/api/svgs/descargar"
          />
        ) : null}
      </div>
    </div>
  );
}
