import { clsx } from "clsx";

interface WizardStepperProps {
  pasos: string[];
  actual: number;
  /** Si se pasa, cada paso se puede clickear para saltar directo ahí — para
   * editar o duplicar, donde los datos ya están cargados y el técnico sabe
   * exactamente qué campo quiere tocar, en vez de forzarlo a pasar por
   * Siguiente uno por uno. En una suite nueva se omite: ahí sí conviene la
   * guía secuencial. */
  onSeleccionar?: (indice: number) => void;
}

export function WizardStepper({
  pasos,
  actual,
  onSeleccionar,
}: WizardStepperProps) {
  return (
    <ol aria-label="Progreso del asistente" className="flex items-center">
      {pasos.map((paso, indice) => {
        const completado = indice < actual;
        const activo = indice === actual;
        const circulo = (
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
              // Se dibuja progresivamente (stroke-dashoffset) en vez de
              // aparecer de golpe, la primera vez que el paso queda listo
              // -- pathLength={1} normaliza el largo del trazo a 0..1 sin
              // tener que calcular el largo real del path a mano.
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path
                  d="M20 6 9 17l-5-5"
                  pathLength={1}
                  strokeDasharray={1}
                  className="animate-[check-dibujo_350ms_ease-out]"
                />
              </svg>
            ) : (
              indice + 1
            )}
          </span>
        );
        return (
          <li key={paso} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              {onSeleccionar ? (
                <button
                  type="button"
                  onClick={() => onSeleccionar(indice)}
                  aria-label={`Ir al paso ${indice + 1}: ${paso}`}
                  className="rounded-full transition-transform duration-[var(--duration-quick)] ease-[var(--ease-motion)] hover:scale-105"
                >
                  {circulo}
                </button>
              ) : (
                circulo
              )}
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
