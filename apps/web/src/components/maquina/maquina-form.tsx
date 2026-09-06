"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import type { MaquinaFormData } from "@/lib/maquina-schema";

interface MaquinaFormProps {
  inicial: MaquinaFormData;
}

type EstadoGuardado = "idle" | "guardando" | "ok" | "error";

interface CampoNumerico {
  clave: keyof MaquinaFormData;
  label: string;
  hint: string;
  sufijo: string;
  step: string;
}

const CAMPOS_LASER: CampoNumerico[] = [
  {
    clave: "laserMaxS",
    label: "Valor S máximo",
    hint: "Parámetro $30 de GRBL correspondiente a 100% de potencia. Valores comunes: 255, 1000 o 10000.",
    sufijo: "",
    step: "1",
  },
  {
    clave: "potenciaModuloW",
    label: "Potencia del módulo",
    hint: "Potencia óptica nominal del módulo láser, respaldo de estimación de energía.",
    sufijo: "W",
    step: "0.1",
  },
  {
    clave: "factorUtilizacionLaser",
    label: "Factor de utilización",
    hint: "Calibración técnica del respaldo de estimación de energía (Plan Maestro 6.1) -- se ajusta una vez comparando kWh estimados vs. medidos.",
    sufijo: "",
    step: "0.01",
  },
  {
    clave: "puntoFocalMm",
    label: "Punto focal (spot)",
    hint: "Diámetro del punto focal del módulo. Define el paso de línea del relleno tipo trama del grabado genérico.",
    sufijo: "mm",
    step: "0.01",
  },
];

const CAMPOS_MOVIMIENTO: CampoNumerico[] = [
  {
    clave: "travelFeedMmMin",
    label: "Velocidad de desplazamiento",
    hint: "Velocidad en vacío (láser apagado) entre celdas.",
    sufijo: "mm/min",
    step: "1",
  },
  {
    clave: "velocidadMaxMmMin",
    label: "Velocidad máxima de ejes",
    hint: "Parámetros $110/$111 de GRBL. GRBL clampea en silencio cualquier F por encima de esto.",
    sufijo: "mm/min",
    step: "1",
  },
  {
    clave: "aceleracionMmS2",
    label: "Aceleración máxima de ejes",
    hint: "Parámetros $120/$121 de GRBL. Usada para calcular el sobre-recorrido (overscan) del relleno tipo trama.",
    sufijo: "mm/s²",
    step: "0.1",
  },
];

const CAMPOS_MESA: CampoNumerico[] = [
  {
    clave: "areaTrabajoAnchoMm",
    label: "Ancho del área de trabajo",
    hint: "Ancho real de la mesa (eje X). El editor SVG/raster (#3) lo usa para advertir si un diseño excede la mesa física.",
    sufijo: "mm",
    step: "1",
  },
  {
    clave: "areaTrabajoAltoMm",
    label: "Alto del área de trabajo",
    hint: "Alto real de la mesa (eje Y). El editor SVG/raster (#3) lo usa para advertir si un diseño excede la mesa física.",
    sufijo: "mm",
    step: "1",
  },
];

function CampoGrupo({
  campos,
  datos,
  errores,
  onCambio,
}: {
  campos: CampoNumerico[];
  datos: MaquinaFormData;
  errores: Partial<Record<keyof MaquinaFormData, string>>;
  onCambio: (clave: keyof MaquinaFormData, valor: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {campos.map((campo) => (
        <Field
          key={campo.clave}
          label={campo.label}
          hint={campo.hint}
          error={errores[campo.clave]}
        >
          {(id, describedBy) => (
            <div className="relative">
              <input
                id={id}
                aria-describedby={describedBy}
                type="number"
                inputMode="decimal"
                min={0}
                step={campo.step}
                value={datos[campo.clave]}
                onChange={(e) => onCambio(campo.clave, e.target.value)}
                className={`${INPUT_CLASSES} font-mono ${campo.sufijo ? "pr-14" : ""}`}
              />
              {campo.sufijo ? (
                <span className="text-text-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
                  {campo.sufijo}
                </span>
              ) : null}
            </div>
          )}
        </Field>
      ))}
    </div>
  );
}

export function MaquinaForm({ inicial }: MaquinaFormProps) {
  const [datos, setDatos] = useState<MaquinaFormData>(inicial);
  const [errores, setErrores] = useState<
    Partial<Record<keyof MaquinaFormData, string>>
  >({});
  const [estado, setEstado] = useState<EstadoGuardado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  function actualizar(clave: keyof MaquinaFormData, valor: string) {
    setEstado("idle");
    setDatos((anterior) => ({ ...anterior, [clave]: valor }));
  }

  async function guardar() {
    setEstado("guardando");
    setErrores({});
    try {
      const respuesta = await fetch("/api/maquina", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      };
      if (cuerpo.ok) {
        setEstado("ok");
      } else {
        setEstado("error");
        setMensajeError(cuerpo.error ?? "No se pudo guardar.");
      }
    } catch {
      setEstado("error");
      setMensajeError("No se pudo conectar con el taller.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <p className="text-navy text-base font-semibold">Láser</p>
        <CampoGrupo
          campos={CAMPOS_LASER}
          datos={datos}
          errores={errores}
          onCambio={actualizar}
        />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <p className="text-navy text-base font-semibold">Movimiento</p>
        <CampoGrupo
          campos={CAMPOS_MOVIMIENTO}
          datos={datos}
          errores={errores}
          onCambio={actualizar}
        />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <p className="text-navy text-base font-semibold">Área de trabajo</p>
        <CampoGrupo
          campos={CAMPOS_MESA}
          datos={datos}
          errores={errores}
          onCambio={actualizar}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-6 opacity-60">
        <div className="flex items-center gap-2">
          <p className="text-navy text-base font-semibold">
            Conexión directa a LaserGRBL
          </p>
          <span className="bg-orange-soft text-orange rounded-full px-2 py-0.5 text-xs font-medium">
            Próximamente
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Enviar G-code y ver el progreso de la corrida directo desde acá, sin
          pasar por LaserGRBL.
        </p>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          onClick={guardar}
          disabled={estado === "guardando"}
        >
          {estado === "guardando" ? "Guardando…" : "Guardar configuración"}
        </Button>
        <div aria-live="polite">
          {estado === "ok" ? (
            <p className="text-teal text-sm font-medium">Guardado.</p>
          ) : null}
          {estado === "error" ? (
            <p role="alert" className="text-danger text-sm font-medium">
              {mensajeError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
