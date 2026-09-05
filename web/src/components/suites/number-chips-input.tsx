"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { XAnimado } from "@/components/ui/icons/x-animado";

interface NumberChipsInputProps {
  label: string;
  hint?: string;
  values: number[];
  onChange: (values: number[]) => void;
  unit: string;
  min: number;
  max?: number;
}

/**
 * Lista editable de números (velocidades, potencias del barrido): cada valor
 * es una decisión explícita del técnico, agregada de a una — nunca un rango
 * adivinado. Cada chip se puede quitar con su propio botón.
 */
export function NumberChipsInput({
  label,
  hint,
  values,
  onChange,
  unit,
  min,
  max,
}: NumberChipsInputProps) {
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState<string | undefined>();

  function agregar() {
    const numero = Number(borrador);
    if (borrador.trim() === "" || !Number.isInteger(numero)) {
      setError("Ingresá un número entero.");
      return;
    }
    if (numero < min || (max !== undefined && numero > max)) {
      setError(
        max !== undefined
          ? `Debe estar entre ${min} y ${max}.`
          : `Debe ser mayor o igual a ${min}.`,
      );
      return;
    }
    if (values.includes(numero)) {
      setError("Ese valor ya está en la lista.");
      return;
    }
    onChange([...values, numero].sort((a, b) => a - b));
    setBorrador("");
    setError(undefined);
  }

  function quitar(numero: number) {
    onChange(values.filter((v) => v !== numero));
  }

  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {values.map((numero) => (
              <span
                key={numero}
                className="bg-blue-soft text-navy inline-flex items-center gap-1 rounded-full py-1 pr-1.5 pl-3 font-mono text-sm"
              >
                {numero}
                {unit}
                <button
                  type="button"
                  onClick={() => quitar(numero)}
                  aria-label={`Quitar ${numero}${unit}`}
                  className="group hover:bg-blue/20 flex size-5 items-center justify-center rounded-full"
                >
                  <XAnimado className="size-3" strokeWidth={2} />
                </button>
              </span>
            ))}
            {values.length === 0 ? (
              <p className="text-text-muted text-sm italic">
                Todavía no agregaste ningún valor.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              id={id}
              type="number"
              inputMode="numeric"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregar();
                }
              }}
              aria-describedby={describedBy}
              className="border-border bg-surface text-navy focus:border-blue focus:outline-blue w-32 rounded-[var(--radius-sm)] border px-3 py-2 font-mono text-sm focus:outline-2 focus:outline-offset-1"
              placeholder={unit}
            />
            <button
              type="button"
              onClick={agregar}
              className="bg-blue-soft text-navy hover:bg-border rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </Field>
  );
}
