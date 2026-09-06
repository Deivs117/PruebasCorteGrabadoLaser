"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { INPUT_CLASSES } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ToastHost, type ToastData } from "@/components/ui/toast";
import { CandidatoCell } from "@/components/registro/candidato-cell";
import { PhotoCell } from "@/components/registro/photo-cell";
import { StarRating } from "@/components/registro/star-rating";
import { TiempoInput } from "@/components/registro/tiempo-input";
import { CELDA_ID_BATERIA } from "@/lib/foto-bateria";
import type { CeldaRegistro, RegistroDetalle } from "@/lib/registro-schema";

interface RegistroEditorProps {
  detalle: RegistroDetalle;
  /** ids (`${corridaId}::${idPrueba}`) ya marcados como candidatos a Final Run. */
  candidatosIniciales: string[];
}

function idCandidato(corridaId: string, celda: CeldaRegistro): string {
  return `${corridaId}::${celda.idPrueba}`;
}

type EstadoGuardado = "idle" | "guardando" | "ok" | "error";

function celdaEvaluada(celda: CeldaRegistro): boolean {
  return celda.cortePasante !== "" && celda.carbonizacion1a5 !== "";
}

export function RegistroEditor({
  detalle,
  candidatosIniciales,
}: RegistroEditorProps) {
  const { corridaId } = detalle;
  const [celdas, setCeldas] = useState<CeldaRegistro[]>(detalle.celdas);
  const [fotoBateria, setFotoBateria] = useState(detalle.fotoBateriaStorageKey);
  const [kwhCorrida, setKwhCorrida] = useState(detalle.kwhCorridaMedido);
  const [tiempoCorrida, setTiempoCorrida] = useState(
    detalle.tiempoRealCorridaS,
  );
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("idle");
  const [mensajeError, setMensajeError] = useState("");
  const [candidatos, setCandidatos] = useState<Set<string>>(
    () => new Set(candidatosIniciales),
  );
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const evaluadas = useMemo(
    () => celdas.filter(celdaEvaluada).length,
    [celdas],
  );

  function mostrarToast(mensaje: string, tono: ToastData["tono"] = "info") {
    setToasts((anteriores) => [
      ...anteriores,
      { id: Date.now() + Math.random(), mensaje, tono },
    ]);
  }

  function cerrarToast(id: number) {
    setToasts((anteriores) => anteriores.filter((t) => t.id !== id));
  }

  async function marcarCandidata(celda: CeldaRegistro) {
    const id = idCandidato(corridaId, celda);
    setCandidatos((anteriores) => new Set(anteriores).add(id));
    try {
      const respuesta = await fetch("/api/candidatos-final-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          corridaId,
          idPrueba: celda.idPrueba,
          archivo: `${corridaId}_registro.csv`,
          material: detalle.material,
          espesorMm: detalle.espesorMm,
          operacion: detalle.operacion,
          velocidadMmMin: celda.velocidadMmMin,
          potenciaPct: celda.potenciaPct,
        }),
      });
      const cuerpo = (await respuesta.json()) as { ok: boolean };
      if (cuerpo.ok) {
        mostrarToast(
          `${celda.idPrueba} quedó marcada como candidata a Final Run.`,
          "exito",
        );
      } else {
        throw new Error("respuesta no ok");
      }
    } catch {
      setCandidatos((anteriores) => {
        const copia = new Set(anteriores);
        copia.delete(id);
        return copia;
      });
      mostrarToast("No se pudo marcar la celda. Intenta de nuevo.");
    }
  }

  async function desmarcarCandidata(celda: CeldaRegistro) {
    const id = idCandidato(corridaId, celda);
    setCandidatos((anteriores) => {
      const copia = new Set(anteriores);
      copia.delete(id);
      return copia;
    });
    try {
      const respuesta = await fetch(
        `/api/candidatos-final-run/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const cuerpo = (await respuesta.json()) as { ok: boolean };
      if (cuerpo.ok) {
        mostrarToast(`${celda.idPrueba} ya no es candidata a Final Run.`);
      } else {
        throw new Error("respuesta no ok");
      }
    } catch {
      setCandidatos((anteriores) => new Set(anteriores).add(id));
      mostrarToast("No se pudo quitar la marca. Intenta de nuevo.");
    }
  }

  function actualizarCelda(indice: number, cambios: Partial<CeldaRegistro>) {
    setEstadoGuardado("idle");
    setCeldas((anteriores) =>
      anteriores.map((celda, i) =>
        i === indice ? { ...celda, ...cambios } : celda,
      ),
    );
  }

  async function guardar() {
    setEstadoGuardado("guardando");
    try {
      const respuesta = await fetch(
        `/api/registros/${encodeURIComponent(corridaId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kwhCorridaMedido: kwhCorrida,
            tiempoRealCorridaS: tiempoCorrida,
            celdas: celdas.map((celda) => ({
              idPrueba: celda.idPrueba,
              cortePasante: celda.cortePasante,
              carbonizacion1a5: celda.carbonizacion1a5,
              notas: celda.notas,
            })),
          }),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      };
      if (cuerpo.ok) {
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
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <ProgressBar
          label="Celdas evaluadas"
          value={evaluadas}
          total={celdas.length}
        />
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-navy text-sm font-medium">Pasadas</span>
            <span className="text-navy font-mono text-lg leading-none">
              {detalle.pasadas}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-navy text-sm font-medium">
              Foto de toda la batería
            </span>
            <PhotoCell
              corridaId={corridaId}
              celdaId={CELDA_ID_BATERIA}
              foto={fotoBateria}
              onChange={setFotoBateria}
              descripcion="toda la batería"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-border text-text-muted border-b text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Prueba
              </th>
              <th scope="col" className="px-4 py-3">
                Corte pasante
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
            {celdas.map((celda, indice) => (
              <tr key={celda.idPrueba}>
                <td className="p-2">
                  <CandidatoCell
                    idPrueba={celda.idPrueba}
                    velocidadMmMin={celda.velocidadMmMin}
                    potenciaPct={celda.potenciaPct}
                    marcado={candidatos.has(idCandidato(corridaId, celda))}
                    onMarcar={() => marcarCandidata(celda)}
                    onDesmarcar={() => desmarcarCandidata(celda)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="border-border inline-flex overflow-hidden rounded-[var(--radius-sm)] border">
                    {(["si", "no"] as const).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={celda.cortePasante === opcion}
                        onClick={() =>
                          actualizarCelda(indice, { cortePasante: opcion })
                        }
                        className={clsx(
                          "px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-[var(--duration-quick)] ease-[var(--ease-motion)]",
                          celda.cortePasante === opcion
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
                    label={`Carbonización, celda ${celda.idPrueba}`}
                    value={celda.carbonizacion1a5}
                    onChange={(v) =>
                      actualizarCelda(indice, { carbonizacion1a5: v })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <PhotoCell
                    corridaId={corridaId}
                    celdaId={celda.idPrueba}
                    foto={celda.fotoStorageKey}
                    onChange={(foto) =>
                      actualizarCelda(indice, { fotoStorageKey: foto })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={celda.notas}
                    onChange={(e) =>
                      actualizarCelda(indice, { notas: e.target.value })
                    }
                    className={clsx(INPUT_CLASSES, "w-40")}
                    aria-label={`Notas de la celda ${celda.idPrueba}`}
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
            <div className="text-sm">
              <TiempoInput
                value={tiempoCorrida}
                onChange={(v) => {
                  setEstadoGuardado("idle");
                  setTiempoCorrida(v);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div aria-live="polite">
              {estadoGuardado === "ok" ? (
                <p className="text-teal text-sm font-medium">Guardado.</p>
              ) : null}
              {estadoGuardado === "error" ? (
                <p role="alert" className="text-orange text-sm font-medium">
                  {mensajeError}
                </p>
              ) : null}
            </div>
            {estadoGuardado === "ok" ? (
              <LinkButton href="/registro" variant="outline">
                Volver a Hoja de Registro
              </LinkButton>
            ) : null}
            <Button
              variant="primary"
              onClick={guardar}
              loading={estadoGuardado === "guardando"}
            >
              {estadoGuardado === "guardando"
                ? "Guardando…"
                : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>

      <ToastHost toasts={toasts} onCerrar={cerrarToast} />
    </div>
  );
}
