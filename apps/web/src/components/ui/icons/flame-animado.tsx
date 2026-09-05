import { clsx } from "clsx";

interface FlameAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Ícono de "Grabado" (llama) que al pasar el mouse parpadea/flamea (ver
 * @keyframes flame-parpadeo) Y cambia de color hacia el naranja de la
 * paleta, gradualmente -- como si se estuviera prendiendo, no solo
 * moviendo. El color es una transición normal (no un loop): se pone
 * naranja al entrar, vuelve al color original al salir.
 */
export function FlameAnimado({
  className,
  strokeWidth = 1.75,
}: FlameAnimadoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx(
        "group-hover:text-orange transition-colors duration-500 ease-[var(--ease-motion)]",
        className,
      )}
      aria-hidden="true"
    >
      <g
        style={{ transformOrigin: "12px 21px" }}
        className="group-hover:animate-[flame-parpadeo_650ms_ease-in-out_infinite]"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </g>
    </svg>
  );
}
