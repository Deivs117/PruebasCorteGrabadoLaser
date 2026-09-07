"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { MaterialSelect } from "@/components/suites/material-select";
import { MaterialCard } from "@/components/materiales/material-card";
import { MaterialDrawer } from "@/components/materiales/material-drawer";
import type {
  MaterialCatalogado,
  MaterialResumen,
} from "@/lib/materiales-catalog";

interface MaterialesGridProps {
  materiales: MaterialResumen[];
}

/**
 * Grid de materiales + drawer de detalle (issue #10). El `MaterialSelect` de
 * arriba es el mismo que usa el wizard de Suites (reuso literal pedido por
 * el issue): si se elige un material ya listado, abre su drawer; si se
 * agrega uno nuevo (el propio `MaterialSelect` ya hizo el POST a
 * `/api/materiales`), aparece de inmediato como una tarjeta más, sin
 * espesores/operaciones todavía porque ningún dato se carga a mano acá.
 */
export function MaterialesGrid({ materiales: iniciales }: MaterialesGridProps) {
  const [materiales, setMateriales] = useState(iniciales);
  const [nombreSeleccion, setNombreSeleccion] = useState("");
  const [nombreDrawer, setNombreDrawer] = useState<string | null>(null);

  const materialDrawer =
    materiales.find((m) => m.nombre === nombreDrawer) ?? null;

  async function manejarSeleccion(nombre: string) {
    const existente = materiales.find(
      (m) => m.nombre.toLowerCase() === nombre.toLowerCase(),
    );
    if (existente) {
      setNombreDrawer(existente.nombre);
      setNombreSeleccion("");
      return;
    }

    // Es un material recién agregado -- MaterialSelect ya hizo el POST a
    // /api/materiales con la familia elegida; acá solo falta reflejarlo en
    // la grilla. Se relee el catálogo (en vez de asumir una familia) para
    // que el ícono salga correcto sin esperar a un refresh de la página.
    let familia: MaterialCatalogado["familia"] = "otro";
    try {
      const respuesta = await fetch("/api/materiales");
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        catalogo?: MaterialCatalogado[];
      };
      familia =
        cuerpo.catalogo?.find(
          (m) => m.nombre.toLowerCase() === nombre.toLowerCase(),
        )?.familia ?? "otro";
    } catch {
      // Si falla la relectura, "otro" es un fallback honesto (nunca
      // inventa una familia) -- el nombre y el registro real ya quedaron
      // guardados igual.
    }

    setMateriales((anteriores) => [
      ...anteriores,
      { nombre, familia, espesoresMm: [], operaciones: [], fichaTecnica: [] },
    ]);
    setNombreDrawer(nombre);
    setNombreSeleccion("");
  }

  return (
    <div className="flex flex-col gap-6">
      <Field label="Agregar material">
        {(id) => (
          <div className="max-w-sm">
            <MaterialSelect
              id={id}
              disponibles={materiales.map((m) => m.nombre)}
              seleccionado={nombreSeleccion}
              onSeleccionar={(nombre) => void manejarSeleccion(nombre)}
            />
          </div>
        )}
      </Field>

      {materiales.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Todavía no hay ningún material en el catálogo"
          description="Agregá el primero desde el selector de arriba, o configurá una suite de prueba con un material nuevo desde Suites de Prueba."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {materiales.map((material) => (
            <MaterialCard
              key={material.nombre}
              material={material}
              onClick={() => setNombreDrawer(material.nombre)}
            />
          ))}
        </div>
      )}

      <MaterialDrawer
        material={materialDrawer}
        onCerrar={() => setNombreDrawer(null)}
      />
    </div>
  );
}
