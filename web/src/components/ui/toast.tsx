"use client";

import { useEffect } from "react";
import { clsx } from "clsx";

export interface ToastData {
  id: number;
  mensaje: string;
  tono?: "info" | "exito";
}

interface ToastProps {
  toast: ToastData;
  onCerrar: (id: number) => void;
  duracionMs?: number;
}

/**
 * Aviso liviano y no bloqueante — a propósito NO es un ConfirmDialog. Se usa
 * para confirmar acciones de gesto (como marcar una celda para Final Run)
 * sin interrumpir al técnico con otro formulario.
 */
export function Toast({ toast, onCerrar, duracionMs = 3200 }: ToastProps) {
  useEffect(() => {
    const temporizador = window.setTimeout(
      () => onCerrar(toast.id),
      duracionMs,
    );
    return () => window.clearTimeout(temporizador);
  }, [toast.id, duracionMs, onCerrar]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "border-border pointer-events-auto rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium shadow-lg",
        "toast-aparece",
        toast.tono === "exito" ? "bg-teal text-white" : "bg-navy text-white",
      )}
    >
      {toast.mensaje}
    </div>
  );
}

interface ToastHostProps {
  toasts: ToastData[];
  onCerrar: (id: number) => void;
}

export function ToastHost({ toasts, onCerrar }: ToastHostProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onCerrar={onCerrar} />
      ))}
    </div>
  );
}
