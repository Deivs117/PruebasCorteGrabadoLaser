"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { clsx } from "clsx";

/** Sube un SVG real (drag&drop o selector de archivo) y navega a su vista
 * previa apenas el servidor confirma que quedó guardado. */
export function SvgDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sobreZona, setSobreZona] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function subir(archivo: File) {
    setSubiendo(true);
    setError(undefined);
    const formulario = new FormData();
    formulario.append("archivo", archivo);

    try {
      const respuesta = await fetch("/api/svgs", {
        method: "POST",
        body: formulario,
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        nombre?: string;
        error?: string;
      };
      if (cuerpo.ok && cuerpo.nombre) {
        router.push(`/grabado-svg?svg=${encodeURIComponent(cuerpo.nombre)}`);
      } else {
        setError(cuerpo.error ?? "No se pudo subir el SVG.");
      }
    } catch {
      setError("No se pudo conectar con el taller.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSobreZona(true);
        }}
        onDragLeave={() => setSobreZona(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobreZona(false);
          const archivo = e.dataTransfer.files[0];
          if (archivo) void subir(archivo);
        }}
        disabled={subiendo}
        className={clsx(
          "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-14 text-center transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
          sobreZona
            ? "border-blue bg-blue-soft"
            : "border-border hover:bg-navy-soft",
        )}
      >
        <UploadCloud
          className="text-blue size-8"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div>
          <p className="text-navy text-sm font-medium">
            {subiendo
              ? "Subiendo…"
              : "Arrastrá un SVG acá, o hacé click para elegirlo"}
          </p>
          <p className="text-text-muted mt-1 text-xs">
            Sin arcos ni transformaciones sin aplanar — exportalo así desde tu
            editor.
          </p>
        </div>
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
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
