"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CameraAnimado } from "@/components/ui/icons/camera-animado";
import { XAnimado } from "@/components/ui/icons/x-animado";

interface PhotoCellProps {
  corridaId: string;
  celdaId: string;
  foto: string;
  onChange: (foto: string) => void;
  /** Texto para el alt de la miniatura — por defecto "la celda {celdaId}",
   * mismo mecanismo pero distinta etiqueta cuando no es una celda puntual
   * (ej. la foto de toda la batería). */
  descripcion?: string;
}

/** Evidencia fotográfica de una celda: sube el archivo real a Supabase
 * Storage al elegirlo (issue #51) -- se guarda de una, independiente del
 * botón "Guardar cambios" de la Hoja de Registro. Un solo control visible
 * por estado, nunca un ícono decorativo al lado de un botón que hace lo mismo. */
export function PhotoCell({
  corridaId,
  celdaId,
  foto,
  onChange,
  descripcion = `la celda ${celdaId}`,
}: PhotoCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const ruta = `/api/fotos/${encodeURIComponent(corridaId)}/${encodeURIComponent(celdaId)}`;

  async function subir(archivo: File) {
    setSubiendo(true);
    setError(undefined);
    const formulario = new FormData();
    formulario.append("archivo", archivo);

    try {
      const respuesta = await fetch(ruta, {
        method: "POST",
        body: formulario,
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        fotoStorageKey?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.fotoStorageKey) {
        onChange(cuerpo.fotoStorageKey);
      } else {
        setError(cuerpo.error ?? "No se pudo subir la foto.");
      }
    } catch {
      setError("No se pudo conectar para subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar() {
    onChange("");
    await fetch(ruta, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {foto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- redirige a una URL firmada de Storage, no sirve desde public/ */}
            <img
              src={ruta}
              alt={`Foto de ${descripcion}`}
              className="border-border size-9 rounded-full border object-cover"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              aria-label="Reemplazar foto"
              title="Reemplazar foto"
              className="group text-navy hover:bg-navy-soft flex size-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] disabled:opacity-40"
            >
              <CameraAnimado className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={quitar}
              disabled={subiendo}
              aria-label="Quitar foto"
              title="Quitar foto"
              className="group text-text-muted hover:bg-danger-soft hover:text-danger flex size-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)] disabled:opacity-40"
            >
              <XAnimado className="size-4" strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
          >
            <CameraAnimado className="size-4" strokeWidth={1.75} />
            {subiendo ? "Subiendo…" : "Subir foto"}
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
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
