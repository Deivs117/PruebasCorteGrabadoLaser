"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";

interface CalcularCosteoButtonProps {
  archivoRegistro: string;
  archivoCosteado: string;
  recalcular?: boolean;
}

/** Corre `compute-costs` de verdad y navega al detalle apenas confirma el
 * resultado real (nunca antes, nunca con datos supuestos). */
export function CalcularCosteoButton({
  archivoRegistro,
  archivoCosteado,
  recalcular = false,
}: CalcularCosteoButtonProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "calculando" | "error">("idle");
  const [mensaje, setMensaje] = useState("");

  async function calcular() {
    setEstado("calculando");
    try {
      const respuesta = await fetch("/api/costeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivo: archivoRegistro }),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      };
      if (cuerpo.ok) {
        router.push(`/costeo/${encodeURIComponent(archivoCosteado)}`);
        router.refresh();
      } else {
        setEstado("error");
        setMensaje(cuerpo.error ?? "No se pudo calcular el costeo.");
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo conectar con el taller.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={recalcular ? "outline" : "primary"}
        size="sm"
        onClick={calcular}
        loading={estado === "calculando"}
      >
        {estado === "calculando"
          ? "Calculando…"
          : recalcular
            ? "Recalcular"
            : "Calcular costos"}
      </Button>
      {estado === "error" ? (
        <p role="alert" className="text-orange flex items-center gap-1 text-xs">
          <TriangleAlertAnimado className="size-3.5" />
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
