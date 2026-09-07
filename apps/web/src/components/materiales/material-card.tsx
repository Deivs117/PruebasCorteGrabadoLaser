import { clsx } from "clsx";
import { Card } from "@/components/ui/card";
import { MaterialIcon } from "@/components/suites/material-icon";
import { colorDeMaterial } from "@/lib/material-color";
import type { MaterialResumen } from "@/lib/materiales-catalog";

const ETIQUETA_OPERACION: Record<"corte" | "grabado", string> = {
  corte: "Corte",
  grabado: "Grabado",
};

/**
 * Tarjeta de un material (grid de "Materiales", issue #10): ícono por
 * familia, chips de espesor y badges de operación — azul si esa operación
 * ya tiene al menos una suite real, gris si todavía no (Prompt 8 de
 * `docs/ui-design/prompts-stitch.md`).
 */
export function MaterialCard({
  material,
  onClick,
}: {
  material: MaterialResumen;
  onClick: () => void;
}) {
  return (
    <Card accent={colorDeMaterial(material.nombre)} className="p-0">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-2">
          <MaterialIcon
            material={material.nombre}
            familia={material.familia}
            color={colorDeMaterial(material.nombre)}
          />
          <p className="text-navy text-base font-semibold">{material.nombre}</p>
        </div>

        {material.espesoresMm.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {material.espesoresMm.map((espesor) => (
              <span
                key={espesor}
                className="bg-navy-soft text-navy rounded-full px-2 py-0.5 font-mono text-xs"
              >
                {espesor}mm
              </span>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-xs">
            Todavía no hay ninguna suite con este material.
          </p>
        )}

        <div className="flex gap-1.5">
          {(["corte", "grabado"] as const).map((operacion) => {
            const tieneDatos = material.operaciones.includes(operacion);
            return (
              <span
                key={operacion}
                className={clsx(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  tieneDatos
                    ? "border-blue/30 bg-blue-soft text-blue"
                    : "border-border bg-navy-soft text-text-muted",
                )}
              >
                {ETIQUETA_OPERACION[operacion]}
              </span>
            );
          })}
        </div>
      </button>
    </Card>
  );
}
