"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { clsx } from "clsx";
import { buttonClasses, iconButtonClasses } from "@/lib/button-styles";
import { MaterialIcon } from "@/components/suites/material-icon";
import { XAnimado } from "@/components/ui/icons/x-animado";
import { colorDeMaterial } from "@/lib/material-color";
import type { MaterialResumen } from "@/lib/materiales-catalog";

const ETIQUETA_FAMILIA: Record<string, string> = {
  madera: "Madera",
  polimero: "Polímero",
  metal: "Metal",
  otro: "Otro",
};

const ETIQUETA_OPERACION: Record<"corte" | "grabado", string> = {
  corte: "Corte",
  grabado: "Grabado",
};

// Mismo patrón que ya usa /ayuda para el SOP (link a GitHub, no un visor de
// markdown propio) — no hay editor/renderer de texto libre en este repo.
const REPO_BLOB =
  "https://github.com/Deivs117/PruebasCorteGrabadoLaser/blob/master";

interface MaterialDrawerProps {
  material: MaterialResumen | null;
  onCerrar: () => void;
}

// Espejo de --duration-standard (globals.css) -- <dialog>.close() saca el
// elemento del "top layer" al instante, así que hay que esperar a que
// termine la transición de salida antes de llamarlo o el slide nunca se ve.
const DURACION_TRANSICION_MS = 250;

/**
 * Panel de detalle lateral (drawer desde la derecha, Prompt 8 de
 * `docs/ui-design/prompts-stitch.md`) — sobre `<dialog>` nativo, mismo
 * fundamento que `ConfirmDialog`: foco atrapado, cierre con Escape y fondo
 * oscurecido los da el navegador. Se posiciona pegado a la derecha en vez
 * de centrado, y entra con un slide (no un fundido) para que se sienta como
 * un panel que aparece desde el borde, no un modal genérico.
 */
export function MaterialDrawer({ material, onCerrar }: MaterialDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  // Sigue mostrando el último material mientras el drawer se desliza hacia
  // afuera -- si se limpiara junto con `material`, el panel quedaría vacío
  // durante los 250ms de la animación de salida.
  const [materialMostrado, setMaterialMostrado] =
    useState<MaterialResumen | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (material) {
      // Cachea el último material no nulo -- no se puede derivar durante el
      // render (necesita seguir mostrando el anterior incluso después de
      // que `material` pase a null, mientras dura la animación de salida).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaterialMostrado(material);
      if (!dialog.open) {
        dialog.showModal();
        // Monta cerrado y recién en el siguiente frame activa la clase de
        // transición -- si arrancara ya visible, no habría desde dónde animar.
        requestAnimationFrame(() => setVisible(true));
      }
      return;
    }

    if (dialog.open) {
      setVisible(false);
      const id = window.setTimeout(
        () => dialog.close(),
        DURACION_TRANSICION_MS,
      );
      return () => window.clearTimeout(id);
    }

    return undefined;
  }, [material]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCerrar}
      className={clsx(
        "border-border bg-surface backdrop:bg-navy/40 fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-full max-w-sm border-l p-0 backdrop:backdrop-blur-[1px]",
        "transition-transform duration-[var(--duration-standard)] ease-[var(--ease-motion)]",
        visible ? "translate-x-0" : "translate-x-full",
      )}
    >
      {materialMostrado ? (
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <MaterialIcon
                material={materialMostrado.nombre}
                familia={materialMostrado.familia}
                color={colorDeMaterial(materialMostrado.nombre)}
                className="size-8"
              />
              <div>
                <p className="text-navy text-base font-semibold">
                  {materialMostrado.nombre}
                </p>
                <p className="text-text-muted text-xs">
                  {ETIQUETA_FAMILIA[materialMostrado.familia]}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar detalle del material"
              className={iconButtonClasses()}
            >
              <XAnimado className="size-4" />
            </button>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-navy text-sm font-semibold">
              Espesores disponibles
            </h3>
            {materialMostrado.espesoresMm.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {materialMostrado.espesoresMm.map((espesor) => (
                  <span
                    key={espesor}
                    className="bg-navy-soft text-navy rounded-full px-2 py-0.5 font-mono text-xs"
                  >
                    {espesor}mm
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm">
                Todavía no hay ninguna suite con este material.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-navy text-sm font-semibold">
              Operaciones con datos
            </h3>
            <div className="flex gap-1.5">
              {(["corte", "grabado"] as const).map((operacion) => {
                const tieneDatos =
                  materialMostrado.operaciones.includes(operacion);
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
          </section>

          <section className="border-border flex flex-col gap-2 border-t pt-4">
            <h3 className="text-navy text-sm font-semibold">Ficha técnica</h3>
            {materialMostrado.fichaTecnica.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {materialMostrado.fichaTecnica.map((archivo) => (
                  <li key={archivo.rutaRelativa}>
                    <a
                      href={`${REPO_BLOB}/${encodeURI(archivo.rutaRelativa)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses(
                        "outline",
                        "sm",
                        "w-full justify-start",
                      )}
                    >
                      <FileText
                        className="size-4 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{archivo.nombre}</span>
                      <ExternalLink
                        className="ml-auto size-3.5 shrink-0"
                        strokeWidth={2}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted text-sm">
                Sin ficha técnica todavía. Cuando se publique un documento en{" "}
                <code className="text-xs">
                  docs/materiales/{materialMostrado.nombre}/
                </code>
                , va a aparecer acá automáticamente.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </dialog>
  );
}
