"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import type { TarifasFormData } from "@/lib/tarifas-schema";

interface TarifasFormProps {
  inicial: TarifasFormData;
}

type EstadoGuardado = "idle" | "guardando" | "ok" | "error";

export function TarifasForm({ inicial }: TarifasFormProps) {
  const [datos, setDatos] = useState<TarifasFormData>(inicial);
  const [estado, setEstado] = useState<EstadoGuardado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  function actualizar(cambios: Partial<TarifasFormData>) {
    setEstado("idle");
    setDatos((anterior) => ({ ...anterior, ...cambios }));
  }

  function actualizarPrecio(
    indice: number,
    cambios: Partial<TarifasFormData["preciosMaterial"][number]>,
  ) {
    setEstado("idle");
    setDatos((anterior) => ({
      ...anterior,
      preciosMaterial: anterior.preciosMaterial.map((p, i) =>
        i === indice ? { ...p, ...cambios } : p,
      ),
    }));
  }

  function agregarMaterial() {
    setDatos((anterior) => ({
      ...anterior,
      preciosMaterial: [
        ...anterior.preciosMaterial,
        { material: "", espesorMm: "", precio: "" },
      ],
    }));
  }

  function quitarMaterial(indice: number) {
    setEstado("idle");
    setDatos((anterior) => ({
      ...anterior,
      preciosMaterial: anterior.preciosMaterial.filter((_, i) => i !== indice),
    }));
  }

  async function guardar() {
    setEstado("guardando");
    try {
      const respuesta = await fetch("/api/tarifas", {
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Moneda" hint="Ej. COP, MXN, USD">
            {(id) => (
              <input
                id={id}
                type="text"
                value={datos.moneda}
                onChange={(e) => actualizar({ moneda: e.target.value })}
                className={INPUT_CLASSES}
              />
            )}
          </Field>
          <Field
            label="Tarifa eléctrica"
            hint="Por kWh, según el recibo del taller"
          >
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={datos.tarifaElectricaPorKwh}
                onChange={(e) =>
                  actualizar({ tarifaElectricaPorKwh: e.target.value })
                }
                className={`${INPUT_CLASSES} font-mono`}
              />
            )}
          </Field>
          <Field
            label="Tarifa hora-máquina"
            hint="Depreciación + mantenimiento por hora"
          >
            {(id) => (
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={datos.tarifaHoraMaquina}
                onChange={(e) =>
                  actualizar({ tarifaHoraMaquina: e.target.value })
                }
                className={`${INPUT_CLASSES} font-mono`}
              />
            )}
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-navy text-base font-semibold">
            Precio de material por m²
          </p>
          <Button variant="outline" size="sm" onClick={agregarMaterial}>
            <Plus className="size-4" strokeWidth={1.75} />
            Agregar material
          </Button>
        </div>

        {datos.preciosMaterial.length === 0 ? (
          <p className="text-text-muted text-sm italic">
            Todavía no agregaste ningún material.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {datos.preciosMaterial.map((precio, indice) => (
              <div
                key={indice}
                className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <Field label="Material">
                  {(id) => (
                    <input
                      id={id}
                      type="text"
                      value={precio.material}
                      onChange={(e) =>
                        actualizarPrecio(indice, { material: e.target.value })
                      }
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
                      value={precio.espesorMm}
                      onChange={(e) =>
                        actualizarPrecio(indice, { espesorMm: e.target.value })
                      }
                      className={`${INPUT_CLASSES} font-mono`}
                    />
                  )}
                </Field>
                <Field label="Precio por m²">
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={precio.precio}
                      onChange={(e) =>
                        actualizarPrecio(indice, { precio: e.target.value })
                      }
                      className={`${INPUT_CLASSES} font-mono`}
                    />
                  )}
                </Field>
                <button
                  type="button"
                  onClick={() => quitarMaterial(indice)}
                  aria-label={`Quitar ${precio.material || "este material"}`}
                  className="text-text-muted hover:bg-danger-soft hover:text-danger flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          onClick={guardar}
          disabled={estado === "guardando"}
        >
          {estado === "guardando" ? "Guardando…" : "Guardar tarifas"}
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
