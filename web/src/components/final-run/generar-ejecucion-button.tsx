"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";

interface GenerarEjecucionButtonProps {
  grupoId: string;
  siguienteEjecucion: number;
}

/** Genera la siguiente ejecución independiente con exactamente los mismos
 * parámetros — no hay nada que elegir de nuevo, por eso no es un formulario. */
export function GenerarEjecucionButton({
  grupoId,
  siguienteEjecucion,
}: GenerarEjecucionButtonProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "generando" | "error">("idle");
  const [mensaje, setMensaje] = useState("");

  async function generar() {
    setEstado("generando");
    try {
      const respuesta = await fetch(
        `/api/final-run/${encodeURIComponent(grupoId)}/ejecucion`,
        {
          method: "POST",
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      };
      if (cuerpo.ok) {
        router.refresh();
        setEstado("idle");
      } else {
        setEstado("error");
        setMensaje(cuerpo.error ?? "No se pudo generar la ejecución.");
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo conectar con el taller.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={generar}
        loading={estado === "generando"}
      >
        {estado === "generando"
          ? "Generando…"
          : `Generar ejecución ${siguienteEjecucion}`}
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
