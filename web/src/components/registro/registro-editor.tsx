"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { INPUT_CLASSES } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PhotoCell } from "@/components/registro/photo-cell";
import { StarRating } from "@/components/registro/star-rating";
import type { FilaRegistro } from "@/lib/registro-schema";

interface RegistroEditorProps {
  archivo: string;
  filasIniciales: FilaRegistro[];
}

type EstadoGuardado = "idle" | "guardando" | "ok" | "error";

function filaEvaluada(fila: FilaRegistro): boolean {
  return (
    fila.corte_pasante !== "" &&
    fila.calidad_borde_1a5 !== "" &&
    fila.carbonizacion_1a5 !== ""
  );
}

export function RegistroEditor({
  archivo,
  filasIniciales,
}: RegistroEditorProps) {
  const [filas, setFilas] = useState<FilaRegistro[]>(filasIniciales);
  const [kwhCorrida, setKwhCorrida] = useState(
    filasIniciales[0]?.kwh_corrida_medido ?? "",
  );
  const [tiempoCorrida, setTiempoCorrida] = useState(
    filasIniciales[0]?.tiempo_real_corrida_s ?? "",
  );
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  const evaluadas = useMemo(() => filas.filter(filaEvaluada).length, [filas]);

  function actualizarFila(indice: number, cambios: Partial<FilaRegistro>) {
    setEstadoGuardado("idle");
    setFilas((anteriores) =>
      anteriores.map((fila, i) =>
        i === indice ? { ...fila, ...cambios } : fila,
      ),
    );
  }

  async function guardar() {
    setEstadoGuardado("guardando");
    const filasConMedicion = filas.map((fila) => ({
      ...fila,
      kwh_corrida_medido: kwhCorrida,
      tiempo_real_corrida_s: tiempoCorrida,
    }));

    try {
      const respuesta = await fetch(
        `/api/registros/${encodeURIComponent(archivo)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filas: filasConMedicion }),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      };
      if (cuerpo.ok) {
        setFilas(filasConMedicion);
        setEstadoGuardado("ok");
      } else {
        setEstadoGuardado("error");
        setMensajeError(cuerpo.error ?? "No se pudo guardar.");
      }
    } catch {
      setEstadoGuardado("error");
      setMensajeError("No se pudo conectar con el taller.");
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Card className="p-4">
        <ProgressBar
          label="Celdas evaluadas"
          value={evaluadas}
          total={filas.length}
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-border text-text-muted border-b text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Celda
              </th>
              <th scope="col" className="px-4 py-3">
                Velocidad
              </th>
              <th scope="col" className="px-4 py-3">
                Potencia
              </th>
              <th scope="col" className="px-4 py-3">
                Corte pasante
              </th>
              <th scope="col" className="px-4 py-3">
                Calidad de borde
              </th>
              <th scope="col" className="px-4 py-3">
                Carbonización
              </th>
              <th scope="col" className="px-4 py-3">
                Foto
              </th>
              <th scope="col" className="px-4 py-3">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {filas.map((fila, indice) => (
              <tr key={fila.id_prueba}>
                <td className="text-navy px-4 py-3 font-mono">
                  {fila.id_prueba}
                </td>
                <td className="text-navy px-4 py-3 font-mono">
                  {fila.velocidad_mm_min}
                </td>
                <td className="text-navy px-4 py-3 font-mono">
                  {fila.potencia_pct}%
                </td>
                <td className="px-4 py-3">
                  <div className="border-border inline-flex overflow-hidden rounded-[var(--radius-sm)] border">
                    {(["si", "no"] as const).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={fila.corte_pasante === opcion}
                        onClick={() =>
                          actualizarFila(indice, { corte_pasante: opcion })
                        }
                        className={clsx(
                          "px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                          fila.corte_pasante === opcion
                            ? "bg-blue text-white"
                            : "bg-surface text-navy hover:bg-navy-soft",
                        )}
                      >
                        {opcion}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StarRating
                    label={`Calidad de borde, celda ${fila.id_prueba}`}
                    value={
                      fila.calidad_borde_1a5 as "" | "1" | "2" | "3" | "4" | "5"
                    }
                    onChange={(v) =>
                      actualizarFila(indice, { calidad_borde_1a5: v })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <StarRating
                    label={`Carbonización, celda ${fila.id_prueba}`}
                    value={
                      fila.carbonizacion_1a5 as "" | "1" | "2" | "3" | "4" | "5"
                    }
                    onChange={(v) =>
                      actualizarFila(indice, { carbonizacion_1a5: v })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <PhotoCell
                    corridaId={fila.corrida_id}
                    celdaId={fila.id_prueba}
                    foto={fila.foto}
                    onChange={(foto) => actualizarFila(indice, { foto })}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={fila.notas}
                    onChange={(e) =>
                      actualizarFila(indice, { notas: e.target.value })
                    }
                    className={clsx(INPUT_CLASSES, "w-40")}
                    aria-label={`Notas de la celda ${fila.id_prueba}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="border-border bg-navy-soft fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 sm:px-6 lg:pl-[var(--shell-sidebar-w)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-navy font-medium">
                kWh medido (corrida completa)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={kwhCorrida}
                onChange={(e) => {
                  setEstadoGuardado("idle");
                  setKwhCorrida(e.target.value);
                }}
                className={clsx(INPUT_CLASSES, "w-40 font-mono")}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-navy font-medium">
                Tiempo real (segundos)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                value={tiempoCorrida}
                onChange={(e) => {
                  setEstadoGuardado("idle");
                  setTiempoCorrida(e.target.value);
                }}
                className={clsx(INPUT_CLASSES, "w-40 font-mono")}
              />
            </label>
          </div>

          <div className="flex items-center gap-3" aria-live="polite">
            {estadoGuardado === "ok" ? (
              <p className="text-teal text-sm font-medium">Guardado.</p>
            ) : null}
            {estadoGuardado === "error" ? (
              <p role="alert" className="text-orange text-sm font-medium">
                {mensajeError}
              </p>
            ) : null}
            <Button
              variant="primary"
              onClick={guardar}
              disabled={estadoGuardado === "guardando"}
            >
              {estadoGuardado === "guardando"
                ? "Guardando…"
                : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
