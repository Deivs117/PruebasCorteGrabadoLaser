"use client";

import { Minus, Plus } from "lucide-react";
import { Field } from "@/components/ui/field";

interface NumberStepperProps {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
}

/** Cantidad discreta y pequeña (pasadas del láser): +/- es más claro que un input libre. */
export function NumberStepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: NumberStepperProps) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="border-border flex w-fit items-center gap-1 rounded-[var(--radius-sm)] border p-1">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - 1))}
            disabled={value <= min}
            aria-label="Reducir"
            className="text-navy hover:bg-navy-soft flex size-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span
            id={id}
            className="text-navy w-10 text-center font-mono text-sm"
            aria-live="polite"
          >
            {value}
          </span>
          <button
            type="button"
            onClick={() =>
              onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)
            }
            disabled={max !== undefined && value >= max}
            aria-label="Aumentar"
            className="text-navy hover:bg-navy-soft flex size-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}
    </Field>
  );
}
