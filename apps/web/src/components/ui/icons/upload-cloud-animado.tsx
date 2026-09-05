import type { AnimationEventHandler } from "react";
import { clsx } from "clsx";

interface UploadCloudAnimadoProps {
  className?: string;
  strokeWidth?: number;
  /** Hay un archivo arrastrado encima de la zona -- la flecha sube hacia
   * la nube en loop lento mientras dure (estado real, no hover). */
  arrastrando?: boolean;
  /** Se acaba de soltar/aceptar un archivo -- rebote chico, una vez. */
  rebotar?: boolean;
  /** Avisa cuándo termina el rebote, para que quien llama apague `rebotar`
   * y no quede "armado" para la próxima subida. */
  onAnimationEnd?: AnimationEventHandler<SVGSVGElement>;
}

/**
 * Reemplazo de `UploadCloud` (lucide-react) para SvgDropzone: la flecha
 * sube hacia la nube en loop lento mientras se arrastra un archivo encima
 * de la zona, y toda la nube da un rebote chico al soltarlo.
 */
export function UploadCloudAnimado({
  className,
  strokeWidth = 1.5,
  arrastrando = false,
  rebotar = false,
  onAnimationEnd,
}: UploadCloudAnimadoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx(
        rebotar && "animate-[uploadcloud-rebote_400ms_ease-out]",
        className,
      )}
      onAnimationEnd={onAnimationEnd}
      aria-hidden="true"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <g
        className={clsx(
          arrastrando &&
            "animate-[uploadcloud-flota_1200ms_ease-in-out_infinite]",
        )}
      >
        <path d="M12 13v8" />
        <path d="m8 17 4-4 4 4" />
      </g>
    </svg>
  );
}
