interface ProgressBarProps {
  value: number;
  total: number;
  label: string;
}

/** Barra de progreso real (celdas evaluadas / total), nunca decorativa. */
export function ProgressBar({ value, total, label }: ProgressBarProps) {
  const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="text-navy font-mono font-medium">
          {value}/{total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
        className="bg-navy-soft h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-teal h-full rounded-full transition-[width] duration-[var(--duration-standard)] ease-[var(--ease-motion)]"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
