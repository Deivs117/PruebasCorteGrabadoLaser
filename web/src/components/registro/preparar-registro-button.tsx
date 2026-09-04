"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrepararRegistroButtonProps {
  archivo: string;
}

/** Corre `prepare-record` sobre un csv recién generado y navega a su
 * Hoja de Registro apenas el CLI confirma el resultado real. */
export function PrepararRegistroButton({
  archivo,
}: PrepararRegistroButtonProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "preparando" | "error">("idle");
  const [mensaje, setMensaje] = useState("");

  async function preparar() {
    setEstado("preparando");
    try {
      const respuesta = await fetch("/api/registros/preparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivo }),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        archivoRegistro?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.archivoRegistro) {
        router.push(`/registro/${encodeURIComponent(cuerpo.archivoRegistro)}`);
      } else {
        setEstado("error");
        setMensaje(cuerpo.error ?? "No se pudo preparar el registro.");
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo conectar con el taller.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        size="sm"
        onClick={preparar}
        loading={estado === "preparando"}
      >
        {estado === "preparando" ? "Preparando…" : "Preparar Registro"}
      </Button>
      {estado === "error" ? (
        <p role="alert" className="text-orange flex items-center gap-1 text-xs">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
