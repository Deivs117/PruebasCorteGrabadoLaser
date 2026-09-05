"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { INPUT_CLASSES } from "@/components/ui/field";
import type { FamiliaMaterial } from "@/lib/materiales-catalog";

const OPCION_NUEVO = "__nuevo__";

const ETIQUETA_FAMILIA: Record<FamiliaMaterial, string> = {
  madera: "Madera",
  polimero: "Polímero",
  metal: "Metal",
  otro: "Otro",
};

interface MaterialSelectProps {
  id: string;
  disponibles: string[];
  seleccionado: string;
  onSeleccionar: (material: string) => void;
}

/**
 * Selector de material con catálogo — reemplaza el texto libre de antes,
 * que dejó pasar un typo real ("MDF Trupan" en pruebas de otro material) sin
 * avisar. Si el material todavía no existe en el catálogo (`disponibles`),
 * se puede agregar ahí mismo, junto con su familia (madera/polímero/metal):
 * queda guardado en el catálogo para la próxima vez (ver /api/materiales),
 * no solo en esta suite.
 */
export function MaterialSelect({
  id,
  disponibles,
  seleccionado,
  onSeleccionar,
}: MaterialSelectProps) {
  const [catalogo, setCatalogo] = useState(disponibles);
  const [agregandoNuevo, setAgregandoNuevo] = useState(
    seleccionado !== "" && !disponibles.includes(seleccionado),
  );
  const [nombreNuevo, setNombreNuevo] = useState(
    agregandoNuevo ? seleccionado : "",
  );
  const [familiaNueva, setFamiliaNueva] = useState<FamiliaMaterial>("otro");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function confirmarNuevoMaterial() {
    const nombre = nombreNuevo.trim();
    if (nombre === "") {
      setError("Escribe el nombre del material.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/materiales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, familia: familiaNueva }),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        catalogo?: { nombre: string }[];
        error?: string;
      };
      if (!cuerpo.ok || !cuerpo.catalogo) {
        throw new Error(cuerpo.error ?? "No se pudo guardar el material.");
      }
      setCatalogo(cuerpo.catalogo.map((m) => m.nombre));
      setAgregandoNuevo(false);
      onSeleccionar(nombre);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el material.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (agregandoNuevo) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            id={id}
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmarNuevoMaterial();
              }
            }}
            placeholder="Ej. Polímero X"
            className={clsx(INPUT_CLASSES, "flex-1")}
          />
          <button
            type="button"
            onClick={() => void confirmarNuevoMaterial()}
            disabled={guardando}
            className="bg-blue rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Agregar"}
          </button>
          {catalogo.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setAgregandoNuevo(false);
                setError("");
              }}
              className="text-text-muted px-2 text-sm hover:underline"
            >
              Cancelar
            </button>
          ) : null}
        </div>
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="text-text-muted mb-1 w-full text-xs">
            Familia del material (decide qué ícono usa en Suites de Prueba):
          </legend>
          {(Object.keys(ETIQUETA_FAMILIA) as FamiliaMaterial[]).map(
            (familia) => (
              <button
                key={familia}
                type="button"
                aria-pressed={familiaNueva === familia}
                onClick={() => setFamiliaNueva(familia)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                  familiaNueva === familia
                    ? "border-blue bg-blue-soft text-blue"
                    : "border-border text-text-muted hover:bg-navy-soft",
                )}
              >
                {ETIQUETA_FAMILIA[familia]}
              </button>
            ),
          )}
        </fieldset>
        {error ? (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <select
      id={id}
      value={seleccionado}
      onChange={(e) => {
        if (e.target.value === OPCION_NUEVO) {
          setNombreNuevo("");
          setFamiliaNueva("otro");
          setAgregandoNuevo(true);
          return;
        }
        onSeleccionar(e.target.value);
      }}
      className={clsx(INPUT_CLASSES, "bg-surface")}
    >
      <option value="" disabled>
        Elegir material…
      </option>
      {catalogo.map((material) => (
        <option key={material} value={material}>
          {material}
        </option>
      ))}
      <option value={OPCION_NUEVO}>+ Agregar material nuevo…</option>
    </select>
  );
}
