"use client";

import { clsx } from "clsx";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import type { EstadoFicha } from "@/lib/final-run-data";
import type { FichaFormData } from "@/lib/ficha-schema";

interface CamposFichaProps {
  datos: FichaFormData;
  onCambio: (cambios: Partial<FichaFormData>) => void;
  errores?: Partial<Record<keyof FichaFormData, string>>;
}

const OPCIONES_ESTADO: { valor: EstadoFicha; label: string }[] = [
  { valor: "en_revision", label: "En revisión" },
  { valor: "oficial", label: "Oficial" },
];

/** Campos editables comunes a "Nueva Ficha" y a editar una ya existente
 * (issue #7) -- un solo lugar para no divergir entre ambos formularios. */
export function CamposFicha({ datos, onCambio, errores }: CamposFichaProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Estado">
        {(id) => (
          <div
            id={id}
            role="radiogroup"
            aria-label="Estado de la ficha"
            className="flex gap-2"
          >
            {OPCIONES_ESTADO.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                role="radio"
                aria-checked={datos.estado === opcion.valor}
                onClick={() => onCambio({ estado: opcion.valor })}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                  datos.estado === opcion.valor
                    ? opcion.valor === "oficial"
                      ? "border-teal bg-teal-soft text-teal"
                      : "border-orange bg-orange-soft text-orange"
                    : "border-border text-text-muted hover:bg-navy-soft",
                )}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Costo estándar total"
          hint="Costo resultante de aplicar velocidad/potencia oficiales (Tarifas)."
          error={errores?.costoEstandarTotal}
        >
          {(id, describedBy) => (
            <input
              id={id}
              aria-describedby={describedBy}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Sin definir"
              value={datos.costoEstandarTotal}
              onChange={(e) => onCambio({ costoEstandarTotal: e.target.value })}
              className={`${INPUT_CLASSES} font-mono`}
            />
          )}
        </Field>

        <Field
          label="Fecha de validación"
          hint="Cuándo se confirmó esta combinación como oficial."
          error={errores?.fechaValidacion}
        >
          {(id, describedBy) => (
            <input
              id={id}
              aria-describedby={describedBy}
              type="date"
              value={datos.fechaValidacion}
              onChange={(e) => onCambio({ fechaValidacion: e.target.value })}
              className={`${INPUT_CLASSES} font-mono`}
            />
          )}
        </Field>
      </div>

      <Field
        label="Notas"
        hint="Observaciones para quien use esta ficha en producción."
      >
        {(id) => (
          <textarea
            id={id}
            rows={3}
            value={datos.notas}
            onChange={(e) => onCambio({ notas: e.target.value })}
            className={INPUT_CLASSES}
          />
        )}
      </Field>
    </div>
  );
}
