import { clsx } from "clsx";

export type BadgeTone = "ok" | "pendiente" | "financiero" | "neutral";

const TONES: Record<BadgeTone, string> = {
  ok: "bg-teal-soft text-teal border border-teal/30",
  pendiente: "bg-orange-soft text-orange border border-orange/30",
  financiero: "bg-purple-soft text-purple border border-purple/30",
  neutral: "bg-navy-soft text-text-muted border border-border",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

/** Estado de negocio (Listo/Pendiente/Rol Financiero), nunca decorativo. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
