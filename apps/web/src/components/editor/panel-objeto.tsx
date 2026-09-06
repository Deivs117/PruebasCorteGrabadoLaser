"use client";

import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { iconButtonClasses } from "@/lib/button-styles";
import { TrashCanAnimado } from "@/components/ui/icons/trash-can-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import type {
  ObjetoLienzo,
  Operacion,
  ParametrosOperacion,
} from "@/lib/editor-tipos";

interface PanelObjetoProps {
  objeto: ObjetoLienzo;
  excedeArea: boolean;
  onCambiar: (cambios: Partial<ObjetoLienzo>) => void;
  onEliminar: () => void;
  onGenerarToolpath: (operacion: Operacion) => void;
}

const OPERACIONES: { valor: Operacion; etiqueta: string }[] = [
  { valor: "corte", etiqueta: "Corte" },
  { valor: "grabado", etiqueta: "Grabado" },
];

function numeroODefault(valor: string, actual: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : actual;
}

/**
 * Panel de propiedades del objeto seleccionado — la fuente de verdad
 * "precisa" del lienzo: mover/rotar con el mouse es cómodo para acomodar a
 * ojo, pero el trabajo de láser necesita números exactos (posición,
 * rotación, velocidad/potencia por operación), así que todo lo que el mouse
 * puede hacer también se puede escribir acá.
 */
export function PanelObjeto({
  objeto,
  excedeArea,
  onCambiar,
  onEliminar,
  onGenerarToolpath,
}: PanelObjetoProps) {
  const proporcionOriginal = objeto.anchoMm / objeto.altoMm;

  function alternarOperacion(operacion: Operacion) {
    const tiene = objeto.operaciones.includes(operacion);
    if (tiene && objeto.operaciones.length === 1) return; // nunca vacío
    const nuevas = tiene
      ? objeto.operaciones.filter((o) => o !== operacion)
      : [...objeto.operaciones, operacion];
    onCambiar({ operaciones: nuevas });
  }

  function actualizarParametro(
    operacion: Operacion,
    cambios: Partial<ParametrosOperacion>,
  ) {
    onCambiar({
      parametros: {
        ...objeto.parametros,
        [operacion]: { ...objeto.parametros[operacion], ...cambios },
      },
    });
  }

  function actualizarAncho(valor: string) {
    const anchoMm = numeroODefault(valor, objeto.anchoMm);
    onCambiar(
      objeto.mantenerProporcion
        ? { anchoMm, altoMm: anchoMm / proporcionOriginal }
        : { anchoMm },
    );
  }

  function actualizarAlto(valor: string) {
    const altoMm = numeroODefault(valor, objeto.altoMm);
    onCambiar(
      objeto.mantenerProporcion
        ? { altoMm, anchoMm: altoMm * proporcionOriginal }
        : { altoMm },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-navy truncate text-sm font-semibold"
          title={objeto.nombre}
        >
          {objeto.nombre}
        </p>
        <button
          type="button"
          onClick={onEliminar}
          aria-label={`Eliminar ${objeto.nombre} del lienzo`}
          className={iconButtonClasses("danger")}
        >
          <TrashCanAnimado className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {excedeArea ? (
        <div className="border-orange/30 bg-orange-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-2.5">
          <TriangleAlertAnimado className="text-orange mt-0.5 size-4 shrink-0" />
          <p className="text-navy text-xs">
            Este objeto no cabe en el área de trabajo en su posición/tamaño
            actual.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Posición X (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={objeto.xMm}
              onChange={(e) =>
                onCambiar({ xMm: numeroODefault(e.target.value, objeto.xMm) })
              }
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
        <Field label="Posición Y (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step="0.5"
              value={objeto.yMm}
              onChange={(e) =>
                onCambiar({ yMm: numeroODefault(e.target.value, objeto.yMm) })
              }
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
        <Field label="Ancho (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={1}
              step="0.5"
              value={Math.round(objeto.anchoMm * 100) / 100}
              onChange={(e) => actualizarAncho(e.target.value)}
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
        <Field label="Alto (mm)">
          {(id) => (
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={1}
              step="0.5"
              value={Math.round(objeto.altoMm * 100) / 100}
              onChange={(e) => actualizarAlto(e.target.value)}
              className={clsx(INPUT_CLASSES, "font-mono")}
            />
          )}
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={objeto.mantenerProporcion}
          onChange={(e) => onCambiar({ mantenerProporcion: e.target.checked })}
          className="accent-blue size-4"
        />
        <span className="text-navy">Mantener proporción al redimensionar</span>
      </label>

      <Field
        label="Rotación (°)"
        hint="Sentido horario, tal como se ve en el lienzo."
      >
        {(id) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onCambiar({ rotacionDeg: (objeto.rotacionDeg + 345) % 360 })
              }
              className={clsx(INPUT_CLASSES, "px-2.5 font-mono")}
              aria-label="Rotar 15 grados en sentido antihorario"
            >
              −15°
            </button>
            <input
              id={id}
              type="number"
              inputMode="numeric"
              value={objeto.rotacionDeg}
              onChange={(e) =>
                onCambiar({
                  rotacionDeg:
                    ((numeroODefault(e.target.value, objeto.rotacionDeg) %
                      360) +
                      360) %
                    360,
                })
              }
              className={clsx(INPUT_CLASSES, "w-full text-center font-mono")}
            />
            <button
              type="button"
              onClick={() =>
                onCambiar({ rotacionDeg: (objeto.rotacionDeg + 15) % 360 })
              }
              className={clsx(INPUT_CLASSES, "px-2.5 font-mono")}
              aria-label="Rotar 15 grados en sentido horario"
            >
              +15°
            </button>
          </div>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-navy text-sm font-medium">Operación</legend>
        <div className="flex gap-2">
          {OPERACIONES.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => alternarOperacion(op.valor)}
              aria-pressed={objeto.operaciones.includes(op.valor)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                objeto.operaciones.includes(op.valor)
                  ? "border-blue bg-blue-soft text-navy"
                  : "border-border text-text-muted hover:bg-navy-soft",
              )}
            >
              {op.etiqueta}
            </button>
          ))}
        </div>
        {objeto.operaciones.length > 1 ? (
          <p className="text-text-muted text-xs">
            El corte va a seguir el contorno del diseño; el grabado, el relleno
            detallado — cada uno con su propia velocidad/potencia.
          </p>
        ) : null}
      </fieldset>

      {objeto.operaciones.map((operacion) => {
        const resultadoToolpath =
          objeto.tipo === "svg" ? objeto.toolpath[operacion] : undefined;
        return (
          <div
            key={operacion}
            className="border-border flex flex-col gap-3 border-t pt-3"
          >
            <p className="text-navy text-xs font-semibold uppercase">
              Parámetros de {operacion}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Velocidad (mm/min)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={objeto.parametros[operacion].velocidadMmMin}
                    onChange={(e) =>
                      actualizarParametro(operacion, {
                        velocidadMmMin: numeroODefault(
                          e.target.value,
                          objeto.parametros[operacion].velocidadMmMin,
                        ),
                      })
                    }
                    className={clsx(INPUT_CLASSES, "font-mono")}
                  />
                )}
              </Field>
              <Field label="Potencia (%)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={objeto.parametros[operacion].potenciaPct}
                    onChange={(e) =>
                      actualizarParametro(operacion, {
                        potenciaPct: numeroODefault(
                          e.target.value,
                          objeto.parametros[operacion].potenciaPct,
                        ),
                      })
                    }
                    className={clsx(INPUT_CLASSES, "font-mono")}
                  />
                )}
              </Field>
            </div>

            {objeto.tipo === "svg" ? (
              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  loading={resultadoToolpath?.estado === "generando"}
                  onClick={() => onGenerarToolpath(operacion)}
                >
                  {resultadoToolpath?.estado === "generando"
                    ? "Generando…"
                    : `Ver toolpath de ${operacion}`}
                </Button>
                {resultadoToolpath?.estado === "error" ? (
                  <p role="alert" className="text-danger text-xs">
                    {resultadoToolpath.mensaje}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-text-muted text-xs">
                El toolpath de imágenes raster todavía no está disponible —
                depende de <code>laser_toolkit.raster</code> (#15), en curso.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
