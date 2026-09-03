import { Check } from "lucide-react";
import { clsx } from "clsx";

interface WizardStepperProps {
  pasos: string[];
  actual: number;
}

/** Progreso del asistente: solo informativo (no navega al hacer click) — avanzar y volver es responsabilidad de los botones Siguiente/Atrás. */
export function WizardStepper({ pasos, actual }: WizardStepperProps) {
  return (
    <ol aria-label="Progreso del asistente" className="flex items-center">
      {pasos.map((paso, indice) => {
        const completado = indice < actual;
        const activo = indice === actual;
        return (
          <li key={paso} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={activo ? "step" : undefined}
                className={clsx(
                  "flex size-8 items-center justify-center rounded-full font-mono text-sm font-medium",
                  "transition-colors duration-[var(--duration-standard)] ease-[var(--ease-motion)]",
                  completado && "bg-teal text-white",
                  activo && "bg-blue text-white",
                  !completado && !activo && "bg-navy-soft text-text-muted",
                )}
              >
                {completado ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  indice + 1
                )}
              </span>
              <span
                className={clsx(
                  "max-w-20 text-center text-xs",
                  activo ? "text-navy font-medium" : "text-text-muted",
                )}
              >
                {paso}
              </span>
            </div>
            {indice < pasos.length - 1 ? (
              <div
                aria-hidden="true"
                className={clsx(
                  "mx-2 mb-5 h-0.5 flex-1 transition-colors duration-[var(--duration-standard)] ease-[var(--ease-motion)]",
                  completado ? "bg-teal" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
