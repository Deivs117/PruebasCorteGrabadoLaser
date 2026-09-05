import { clsx } from "clsx";
import { FlameAnimado } from "@/components/ui/icons/flame-animado";
import { ScissorsAnimado } from "@/components/ui/icons/scissors-animado";

type Operacion = "corte" | "grabado";

const OPCIONES = [
  { valor: "corte" as const, etiqueta: "Corte", Icono: ScissorsAnimado },
  { valor: "grabado" as const, etiqueta: "Grabado", Icono: FlameAnimado },
];

interface OperacionSelectorProps {
  valor: Operacion | null;
  onSeleccionar: (valor: Operacion) => void;
}

/** Elegir corte o grabado -- usado tanto en el asistente de Suites como en
 * Final Run, antes duplicado a mano en los dos lugares. */
export function OperacionSelector({
  valor,
  onSeleccionar,
}: OperacionSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {OPCIONES.map(({ valor: v, etiqueta, Icono }) => (
        <button
          key={v}
          type="button"
          onClick={() => onSeleccionar(v)}
          aria-pressed={valor === v}
          className={clsx(
            "group flex flex-col items-center gap-2 rounded-[var(--radius-md)] border p-6 transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
            valor === v
              ? "border-blue bg-blue-soft"
              : "border-border hover:bg-navy-soft",
          )}
        >
          <Icono className="text-navy size-6" />
          <span className="text-navy text-sm font-medium">{etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
