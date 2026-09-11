"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CamposFicha } from "@/components/fichas/campos-ficha";
import { ExportarPdfButton } from "@/components/fichas/exportar-pdf-button";
import { FichaDocumento } from "@/components/fichas/ficha-documento";
import type { CostosFicha } from "@/lib/final-run-data";
import type { Ficha } from "@/lib/fichas-data";
import type { FichaFormData } from "@/lib/ficha-schema";

interface FichaDetalleProps {
  inicial: Ficha;
}

function aFormData(ficha: Ficha): FichaFormData {
  return {
    estado: ficha.estado,
    fechaValidacion: ficha.fechaValidacion,
    notas: ficha.notas,
  };
}

/** Ver / editar una Ficha ya existente (issue #7) -- el mismo componente
 * alterna entre el documento de solo lectura (+ exportar a PDF) y el
 * formulario de edición, sin navegar a otra ruta. */
export function FichaDetalle({ inicial }: FichaDetalleProps) {
  const [ficha, setFicha] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState<FichaFormData>(() => aFormData(inicial));
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [mensajeError, setMensajeError] = useState("");
  const [regenerando, setRegenerando] = useState(false);
  const [errorRegenerar, setErrorRegenerar] = useState("");

  function empezarEdicion() {
    setDatos(aFormData(ficha));
    setEstado("idle");
    setEditando(true);
  }

  async function guardar() {
    setEstado("guardando");
    try {
      const respuesta = await fetch(
        `/api/final-run/${encodeURIComponent(ficha.grupoId)}/ficha`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      } & Partial<CostosFicha>;
      if (cuerpo.ok) {
        // El backend recalcula el costo por mm/mm² al guardar (issue #170)
        // -- se refleja acá también, no solo lo que el formulario editó.
        setFicha((anterior) => ({ ...anterior, ...datos, ...cuerpo }));
        setEditando(false);
      } else {
        setEstado("error");
        setMensajeError(cuerpo.error ?? "No se pudo guardar la ficha.");
      }
    } catch {
      setEstado("error");
      setMensajeError("No se pudo conectar con el taller.");
    }
  }

  async function regenerarCostos() {
    setRegenerando(true);
    setErrorRegenerar("");
    try {
      const respuesta = await fetch(
        `/api/final-run/${encodeURIComponent(ficha.grupoId)}/ficha/regenerar-costos`,
        { method: "POST" },
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        error?: string;
      } & Partial<CostosFicha>;
      if (cuerpo.ok) {
        setFicha((anterior) => ({ ...anterior, ...cuerpo }));
      } else {
        setErrorRegenerar(
          cuerpo.error ?? "No se pudieron regenerar los costos.",
        );
      }
    } catch {
      setErrorRegenerar("No se pudo conectar con el taller.");
    } finally {
      setRegenerando(false);
    }
  }

  if (editando) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <CamposFicha
              datos={datos}
              onCambio={(cambios) =>
                setDatos((anterior) => ({ ...anterior, ...cambios }))
              }
            />
          </Card>
          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              onClick={guardar}
              disabled={estado === "guardando"}
            >
              {estado === "guardando" ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditando(false)}
              disabled={estado === "guardando"}
            >
              Cancelar
            </Button>
            {estado === "error" ? (
              <p role="alert" className="text-danger text-sm font-medium">
                {mensajeError}
              </p>
            ) : null}
          </div>
        </div>
        <FichaDocumento
          material={ficha.material}
          espesorMm={ficha.espesorMm}
          operacion={ficha.operacion}
          velocidadMmMin={ficha.velocidadMmMin}
          potenciaPct={ficha.potenciaPct}
          grupoId={ficha.grupoId}
          estado={datos.estado}
          costoPorMm={ficha.costoPorMm}
          tiempoPorMmS={ficha.tiempoPorMmS}
          costoPorMm2={ficha.costoPorMm2}
          tiempoPorMm2S={ficha.tiempoPorMm2S}
          materialCostoPendiente={ficha.materialCostoPendiente}
          fechaValidacion={datos.fechaValidacion}
          notas={datos.notas}
          notasOperario={ficha.notasOperario}
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <FichaDocumento
        material={ficha.material}
        espesorMm={ficha.espesorMm}
        operacion={ficha.operacion}
        velocidadMmMin={ficha.velocidadMmMin}
        potenciaPct={ficha.potenciaPct}
        grupoId={ficha.grupoId}
        estado={ficha.estado}
        costoPorMm={ficha.costoPorMm}
        tiempoPorMmS={ficha.tiempoPorMmS}
        costoPorMm2={ficha.costoPorMm2}
        tiempoPorMm2S={ficha.tiempoPorMm2S}
        materialCostoPendiente={ficha.materialCostoPendiente}
        fechaValidacion={ficha.fechaValidacion}
        notas={ficha.notas}
        notasOperario={ficha.notasOperario}
      />
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <ExportarPdfButton />
        <Button variant="outline" onClick={empezarEdicion}>
          Editar
        </Button>
        <Button
          variant="outline"
          onClick={regenerarCostos}
          disabled={regenerando}
        >
          {regenerando ? "Regenerando…" : "Regenerar costos"}
        </Button>
        {errorRegenerar ? (
          <p role="alert" className="text-danger text-sm font-medium">
            {errorRegenerar}
          </p>
        ) : null}
      </div>
    </div>
  );
}
