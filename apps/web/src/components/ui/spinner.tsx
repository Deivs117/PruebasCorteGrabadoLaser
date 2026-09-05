import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

/** Indicador de proceso en curso (generar, guardar, preparar, calcular) —
 * antes solo cambiaba el texto del botón ("Guardando…"), sin ninguna señal
 * visual. `animate-spin` es lineal a propósito (regla del skill de motion:
 * spinners son la única excepción a "nunca linear"). */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden="true"
      className={clsx("size-4 animate-spin", className)}
    />
  );
}
