"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { CopyAnimado } from "@/components/ui/icons/copy-animado";
import { iconButtonClasses } from "@/lib/button-styles";
import { loteSiguiente } from "@/lib/lote-siguiente";

interface DuplicarSuiteButtonProps {
  archivo: string;
  material: string;
  espesorMm: number;
  operacion: "corte" | "grabado";
  loteActual: string;
}

/**
 * Copia una suite existente al asistente de "Nueva suite" sin retipear
 * parámetros. Pide el lote nuevo ANTES de abrir el asistente (no dentro,
 * como un campo más) porque el nombre de archivo de salida depende de
 * material+espesor+operación+fecha+lote: si el lote quedara igual, la
 * corrida duplicada chocaría con la original apenas se guardara.
 *
 * La sugerencia inicial no es solo "el lote de origen + 1": eso rompía en
 * la práctica apenas se duplicaba una segunda vez (L01 -> L02 sugerido, pero
 * L02 ya existía de la primera duplicación) -- se le pide al servidor el
 * primer lote realmente libre para esta identidad.
 */
export function DuplicarSuiteButton({
  archivo,
  material,
  espesorMm,
  operacion,
  loteActual,
}: DuplicarSuiteButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [lote, setLote] = useState(() => loteSiguiente(loteActual));
  const [buscandoSugerencia, setBuscandoSugerencia] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierto && !dialog.open) dialog.showModal();
    if (!abierto && dialog.open) dialog.close();
  }, [abierto]);

  async function abrir() {
    setAbierto(true);
    setLote(loteSiguiente(loteActual)); // valor optimista mientras se confirma con el servidor
    setBuscandoSugerencia(true);
    try {
      const parametros = new URLSearchParams({
        material,
        espesorMm: String(espesorMm),
        operacion,
        loteActual,
      });
      const respuesta = await fetch(`/api/lote-sugerido?${parametros}`);
      const cuerpo = (await respuesta.json()) as { ok: boolean; lote?: string };
      if (cuerpo.ok && cuerpo.lote) setLote(cuerpo.lote);
    } catch {
      // se queda con la sugerencia optimista; el servidor igual valida al guardar
    } finally {
      setBuscandoSugerencia(false);
    }
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
        onClick={() => void abrir()}
        aria-label={`Duplicar suite de ${material}`}
        className={iconButtonClasses()}
      >
        <CopyAnimado className="size-4" />
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
            <span className="font-mono">{loteActual}</span>) para que la corrida
            generada no choque con esa suite.
          </p>
          <Field
            label="Nuevo lote"
            hint={
              buscandoSugerencia ? "Buscando el próximo lote libre…" : undefined
            }
            error={
              !buscandoSugerencia && lote.trim() === loteActual
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
