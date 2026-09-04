"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Muestra el spinner en el botón de confirmar (ver Button) mientras la
   * acción está en curso — el label ya cambia a texto ("Eliminando…"), esto
   * agrega la señal visual que faltaba. */
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación de una acción destructiva, sobre `<dialog>` nativo: foco
 * atrapado, cierre con Escape y fondo oscurecido los da el navegador, no
 * hay que reconstruirlos a mano.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="border-border bg-surface backdrop:bg-navy/40 m-auto rounded-[var(--radius-lg)] border p-0 backdrop:backdrop-blur-[1px]"
    >
      <div className="flex w-80 flex-col gap-4 p-6">
        <p className="text-navy text-base font-semibold">{title}</p>
        <p className="text-text-muted text-sm">{description}</p>
        {/* Eliminar a la izquierda a propósito: el hábito es hacer click a
            la derecha, y ahí queda "Cancelar" — una acción destructiva no
            debe quedar donde cae el click por reflejo. */}
        <div className="flex justify-between gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={confirming}
          >
            {confirmLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
