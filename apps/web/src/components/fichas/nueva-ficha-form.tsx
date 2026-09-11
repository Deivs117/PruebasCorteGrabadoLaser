"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { CamposFicha } from "@/components/fichas/campos-ficha";
import { FichaDocumento } from "@/components/fichas/ficha-documento";
import type { GrupoCalibracion } from "@/lib/final-run-data";
import type { FichaFormData } from "@/lib/ficha-schema";

interface NuevaFichaFormProps {
  /** Ya filtrados a los que todavía no tienen Ficha (`fichaEstado === null`). */
  grupos: GrupoCalibracion[];
}

/** AAAA-MM-DD en la fecha local (no `toISOString`, que es UTC y puede
 * quedar un día atrás/adelante cerca de medianoche). */
function hoyISO(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** Defaults sugeridos al elegir un grupo (issue #170): `oficial` si ya está
 * calibrado (≥3 ejecuciones medidas), si no `en_revision`; fecha de hoy.
 * Ambos siguen siendo editables acá mismo -- son solo el punto de partida,
 * no se reevalúan después de creada la Ficha. */
function datosSugeridos(grupo: GrupoCalibracion): FichaFormData {
  return {
    estado: grupo.calibrado ? "oficial" : "en_revision",
    fechaValidacion: hoyISO(),
    notas: "",
  };
}

export function NuevaFichaForm({ grupos }: NuevaFichaFormProps) {
  const router = useRouter();
  const [grupoId, setGrupoId] = useState("");
  const [datos, setDatos] = useState<FichaFormData | null>(null);
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [mensajeError, setMensajeError] = useState("");

  const grupo = grupos.find((g) => g.grupoId === grupoId);

  function elegirGrupo(id: string) {
    setGrupoId(id);
    const elegido = grupos.find((g) => g.grupoId === id);
    setDatos(elegido ? datosSugeridos(elegido) : null);
    setEstado("idle");
  }

  function actualizar(cambios: Partial<FichaFormData>) {
    setEstado("idle");
    setDatos((anterior) => (anterior ? { ...anterior, ...cambios } : anterior));
  }

  async function guardar() {
    if (!grupo || !datos) return;
    setEstado("guardando");
    try {
      const respuesta = await fetch(
        `/api/final-run/${encodeURIComponent(grupo.grupoId)}/ficha`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      };
      if (cuerpo.ok) {
        router.push(`/fichas/${encodeURIComponent(grupo.grupoId)}`);
      } else {
        setEstado("error");
        setMensajeError(cuerpo.error ?? "No se pudo guardar la ficha.");
      }
    } catch {
      setEstado("error");
      setMensajeError("No se pudo conectar con el taller.");
    }
  }

  if (grupos.length === 0) {
    return (
      <Card className="p-6 text-sm">
        <p className="text-navy font-medium">
          No hay ningún grupo de calibración sin Ficha todavía.
        </p>
        <p className="text-text-muted mt-1">
          Corré una Final Run en{" "}
          <Link href="/final-run" className="text-blue hover:text-blue-hover">
            Final Run (Calibración)
          </Link>{" "}
          antes de crear una Ficha nueva.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-6">
          <Field
            label="Grupo de calibración"
            hint="Material, espesor, operación, velocidad y potencia ya fijados por una Final Run."
          >
            {(id) => (
              <select
                id={id}
                value={grupoId}
                onChange={(e) => elegirGrupo(e.target.value)}
                className={`${INPUT_CLASSES} bg-surface`}
              >
                <option value="" disabled>
                  Elegir grupo…
                </option>
                {grupos.map((g) => (
                  <option key={g.grupoId} value={g.grupoId}>
                    {g.material} · {g.espesorMm}mm · {g.operacion} ·{" "}
                    {g.velocidadMmMin}mm/min · {g.potenciaPct}%
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Card>

        {grupo && datos ? (
          <Card className="flex flex-col gap-4 p-6">
            <CamposFicha datos={datos} onCambio={actualizar} />
          </Card>
        ) : null}

        {grupo && datos ? (
          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              onClick={guardar}
              disabled={estado === "guardando"}
            >
              {estado === "guardando" ? "Guardando…" : "Crear Ficha"}
            </Button>
            {estado === "error" ? (
              <p role="alert" className="text-danger text-sm font-medium">
                {mensajeError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        {grupo && datos ? (
          <FichaDocumento
            material={grupo.material}
            espesorMm={grupo.espesorMm}
            operacion={grupo.operacion}
            velocidadMmMin={grupo.velocidadMmMin}
            potenciaPct={grupo.potenciaPct}
            grupoId={grupo.grupoId}
            estado={datos.estado}
            costoPorMm=""
            tiempoPorMmS=""
            costoPorMm2=""
            tiempoPorMm2S=""
            materialCostoPendiente={false}
            fechaValidacion={datos.fechaValidacion}
            notas={datos.notas}
            notasOperario={[]}
          />
        ) : (
          <Card className="text-text-muted p-6 text-center text-sm">
            Elegí un grupo para ver la vista previa de la ficha.
          </Card>
        )}
      </div>
    </div>
  );
}
