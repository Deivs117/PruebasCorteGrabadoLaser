interface CameraAnimadoProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Reemplazo de `Camera` (lucide-react) para subir/reemplazar foto: el
 * diafragma (círculo del lente) "parpadea" con un flash breve al pasar el
 * mouse -- una vez por hover, no un loop (ver @keyframes camera-flash).
 */
export function CameraAnimado({
  className,
  strokeWidth = 1.75,
}: CameraAnimadoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
      <circle cx="12" cy="13" r="3" />
      {/* Flash -- oculto en reposo, un destello breve al pasar el mouse. */}
      <circle
        cx="12"
        cy="13"
        r="1.4"
        fill="currentColor"
        stroke="none"
        style={{ transformOrigin: "12px 13px" }}
        className="opacity-0 group-hover:animate-[camera-flash_450ms_ease-out]"
      />
    </svg>
  );
}
