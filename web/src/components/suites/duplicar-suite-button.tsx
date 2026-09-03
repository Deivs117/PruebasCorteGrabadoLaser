"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { loteSiguiente } from "@/lib/lote-siguiente";

interface DuplicarSuiteButtonProps {
  archivo: string;
  material: string;
  loteActual: string;
}

/**
 * Copia una suite existente al asistente de "Nueva suite" sin retipear
 * parámetros. Pide el lote nuevo ANTES de abrir el asistente (no dentro,
 * como un campo más) porque el nombre de archivo de salida depende de
 * material+espesor+operación+fecha+lote: si el lote quedara igual, la
 * corrida duplicada chocaría con la original apenas se guardara.
 */
export function DuplicarSuiteButton({
  archivo,
  material,
  loteActual,
}: DuplicarSuiteButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [lote, setLote] = useState(() => loteSiguiente(loteActual));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierto && !dialog.open) dialog.showModal();
    if (!abierto && dialog.open) dialog.close();
  }, [abierto]);

  function abrir() {
    setLote(loteSiguiente(loteActual));
    setAbierto(true);
  }

  function continuar() {
    const loteLimpio = lote.trim();
    if (!loteLimpio || loteLimpio === loteActual) return;
    setAbierto(false);
    router.push(
      `/suites/nueva?duplicar=${encodeURIComponent(archivo)}&lote=${encodeURIComponent(loteLimpio)}`,
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Duplicar suite de ${material}`}
        className="text-text-muted hover:bg-navy-soft hover:text-navy flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]"
      >
        <Copy className="size-4" strokeWidth={1.75} />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setAbierto(false)}
        className="border-border bg-surface backdrop:bg-navy/40 m-auto rounded-[var(--radius-lg)] border p-0 backdrop:backdrop-blur-[1px]"
      >
        <div className="flex w-80 flex-col gap-4 p-6">
          <p className="text-navy text-base font-semibold">
            Duplicar suite de {material}
          </p>
          <p className="text-text-muted text-sm">
            Se abre el asistente con los mismos parámetros, listo para ajustar
            lo que necesites. Elegí un lote distinto al original (
            <span className="font-mono">{loteActual}</span>) para que la
            corrida generada no choque con esa suite.
          </p>
          <Field
            label="Nuevo lote"
            error={
              lote.trim() === loteActual
                ? "Tiene que ser distinto al lote original."
                : undefined
            }
          >
            {(id, describedBy) => (
              <input
                id={id}
                type="text"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                aria-describedby={describedBy}
                className={INPUT_CLASSES}
              />
            )}
          </Field>
          <div className="flex justify-between gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={continuar}
              disabled={!lote.trim() || lote.trim() === loteActual}
            >
              Duplicar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
