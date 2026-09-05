"use client";

import { useId } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

/**
 * Envoltorio de un campo de formulario: asocia label + input + texto de
 * ayuda/error por id, para que el error quede pegado al campo (regla de
 * negocio de formularios) y el lector de pantalla lo anuncie.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-navy text-sm font-medium">
        {label}
      </label>
      {children(id, describedBy)}
      {hint ? (
        <p id={hintId} className="text-text-muted text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const INPUT_CLASSES =
  "rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-navy " +
  "transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] " +
  "focus:border-blue focus:outline-2 focus:outline-offset-1 focus:outline-blue";
