"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCellProps {
  corridaId: string;
  celdaId: string;
  foto: string;
  onChange: (foto: string) => void;
}

/** Evidencia fotográfica de una celda: sube el archivo real a data/fotos/ al
 * elegirlo — la referencia queda en la fila recién cuando se guarda el
 * registro completo, como el resto de los campos. */
export function PhotoCell({
  corridaId,
  celdaId,
  foto,
  onChange,
}: PhotoCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function subir(archivo: File) {
    setSubiendo(true);
    setError(undefined);
    const formulario = new FormData();
    formulario.append("archivo", archivo);
    formulario.append("corridaId", corridaId);
    formulario.append("celdaId", celdaId);

    try {
      const respuesta = await fetch("/api/fotos", {
        method: "POST",
        body: formulario,
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        nombre?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.nombre) {
        onChange(cuerpo.nombre);
      } else {
        setError(cuerpo.error ?? "No se pudo subir la foto.");
      }
    } catch {
      setError("No se pudo conectar para subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen local servida por nuestra propia API, fuera de public/
        <img
          src={`/api/fotos/${encodeURIComponent(foto)}`}
          alt={`Foto de la celda ${celdaId}`}
          className="border-border size-9 rounded-full border object-cover"
        />
      ) : (
        <span
          className="bg-navy-soft text-text-muted flex size-9 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Camera className="size-4" />
        </span>
      )}
      <div className="flex flex-col gap-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
        >
          {subiendo ? "Subiendo…" : foto ? "Reemplazar" : "Subir foto"}
        </Button>
        {error ? (
          <p role="alert" className="text-orange text-xs">
            {error}
          </p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) void subir(archivo);
          e.target.value = "";
        }}
      />
    </div>
  );
}
