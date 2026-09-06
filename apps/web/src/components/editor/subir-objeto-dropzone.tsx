"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import { UploadCloudAnimado } from "@/components/ui/icons/upload-cloud-animado";
import { svgADataUri } from "@/lib/svg-data-uri";
import { PARAMETROS_POR_DEFECTO, type ObjetoLienzo } from "@/lib/editor-tipos";
import { medirImagen } from "@/components/editor/usar-imagen-cargada";

interface SubirObjetoDropzoneProps {
  onAgregar: (objeto: ObjetoLienzo) => void;
  /** Centro sugerido (mm) para el próximo objeto — el lienzo va escalonando
   * la posición para que subir varios seguidos no los apile exactos uno
   * sobre otro. */
  siguientePosicion: () => { xMm: number; yMm: number };
}

/** Lado más largo del objeto recién subido, en mm — el operario ajusta el
 * tamaño real después desde el panel; esto solo evita que aparezca
 * ridículamente grande o invisible de chico. */
const TAMANO_INICIAL_MM = 40;

function leerComoDataUri(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

function dimensionesIniciales(anchoPx: number, altoPx: number) {
  const proporcion = anchoPx / altoPx || 1;
  return proporcion >= 1
    ? { anchoMm: TAMANO_INICIAL_MM, altoMm: TAMANO_INICIAL_MM / proporcion }
    : { anchoMm: TAMANO_INICIAL_MM * proporcion, altoMm: TAMANO_INICIAL_MM };
}

/**
 * Sube un SVG o una imagen raster (PNG/JPEG) y lo agrega como objeto nuevo
 * al lienzo. El SVG se persiste vía `/api/svgs` (mismo almacenamiento que ya
 * usa "Grabado Vectorial") porque hace falta guardado para pedir su
 * conversión a G-code; la imagen raster todavía no tiene a dónde persistir
 * en el backend (#15 no existe todavía), así que vive solo en el navegador
 * como data URI mientras dure la sesión del lienzo.
 */
export function SubirObjetoDropzone({
  onAgregar,
  siguientePosicion,
}: SubirObjetoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sobreZona, setSobreZona] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function agregarSvg(archivo: File) {
    const formulario = new FormData();
    formulario.append("archivo", archivo);
    const respuesta = await fetch("/api/svgs", {
      method: "POST",
      body: formulario,
    });
    const cuerpo = (await respuesta.json()) as {
      ok: boolean;
      nombre?: string;
      contenido?: string;
      error?: string;
    };
    if (!cuerpo.ok || !cuerpo.nombre || cuerpo.contenido === undefined) {
      throw new Error(cuerpo.error ?? "No se pudo subir el SVG.");
    }

    const { anchoPx, altoPx } = await medirImagen(
      svgADataUri(cuerpo.contenido),
    );
    const { xMm, yMm } = siguientePosicion();
    onAgregar({
      id: crypto.randomUUID(),
      tipo: "svg",
      nombre: archivo.name,
      nombreArchivoSvg: cuerpo.nombre,
      contenidoSvg: cuerpo.contenido,
      xMm,
      yMm,
      ...dimensionesIniciales(anchoPx, altoPx),
      rotacionDeg: 0,
      operaciones: ["grabado"],
      parametros: PARAMETROS_POR_DEFECTO,
      mantenerProporcion: true,
      resolucionRellenoMm: 0.3,
      toolpath: {},
    });
  }

  async function agregarRaster(archivo: File) {
    const dataUri = await leerComoDataUri(archivo);
    const { anchoPx, altoPx } = await medirImagen(dataUri);
    const { xMm, yMm } = siguientePosicion();
    onAgregar({
      id: crypto.randomUUID(),
      tipo: "raster",
      nombre: archivo.name,
      dataUri,
      xMm,
      yMm,
      ...dimensionesIniciales(anchoPx, altoPx),
      rotacionDeg: 0,
      operaciones: ["grabado"],
      parametros: PARAMETROS_POR_DEFECTO,
      mantenerProporcion: true,
    });
  }

  async function subir(archivo: File) {
    setSubiendo(true);
    setError(undefined);
    try {
      const nombre = archivo.name.toLowerCase();
      if (nombre.endsWith(".svg") || archivo.type === "image/svg+xml") {
        await agregarSvg(archivo);
      } else if (/\.(png|jpe?g)$/.test(nombre)) {
        await agregarRaster(archivo);
      } else {
        setError("Solo se aceptan archivos .svg, .png o .jpg/.jpeg.");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el archivo.",
      );
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
          "flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-8 text-center transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
          sobreZona
            ? "border-blue bg-blue-soft"
            : "border-border hover:bg-navy-soft",
        )}
      >
        <UploadCloudAnimado
          className="text-blue size-6"
          strokeWidth={1.5}
          arrastrando={sobreZona}
        />
        <p className="text-navy text-sm font-medium">
          {subiendo
            ? "Agregando…"
            : "Arrastrá un SVG o imagen acá, o hacé click para elegir"}
        </p>
        <p className="text-text-muted text-xs">SVG, PNG o JPEG.</p>
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml,.png,image/png,.jpg,.jpeg,image/jpeg"
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
