"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { CircleCheckAnimado } from "@/components/ui/icons/circle-check-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { cambiarPasswordSchema } from "@/lib/admin-schema";
import { crearClienteBrowser } from "@/lib/supabase/client";

type Estado = "idle" | "enviando" | "error" | "exito";

/**
 * Cambiar la contraseña propia (#117, parte A): `supabase.auth.updateUser`
 * directo desde el cliente -- la sesión ya está activa, no hace falta
 * backend nuevo ni la `service_role` key (esa solo la usa el Panel de
 * Generación de Credenciales, /admin, sobre CUENTAS AJENAS).
 */
export function CambiarPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const analisis = cambiarPasswordSchema.safeParse({
      password,
      confirmacion,
    });
    if (!analisis.success) {
      setEstado("error");
      setMensajeError(analisis.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setEstado("enviando");
    const supabase = crearClienteBrowser();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setEstado("error");
      setMensajeError(error.message);
      return;
    }

    setEstado("exito");
    setPassword("");
    setConfirmacion("");
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Field label="Contraseña nueva">
          {(id) => (
            <div className="relative">
              <Lock
                className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                strokeWidth={1.75}
              />
              <input
                id={id}
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASSES} w-full pl-9`}
              />
            </div>
          )}
        </Field>

        <Field label="Confirmar contraseña nueva">
          {(id) => (
            <div className="relative">
              <Lock
                className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                strokeWidth={1.75}
              />
              <input
                id={id}
                type="password"
                required
                autoComplete="new-password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className={`${INPUT_CLASSES} w-full pl-9`}
              />
            </div>
          )}
        </Field>

        {estado === "error" ? (
          <div
            role="alert"
            className="border-orange/30 bg-orange-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-3"
          >
            <TriangleAlertAnimado className="text-orange mt-0.5 size-4 shrink-0" />
            <p className="text-navy text-sm">{mensajeError}</p>
          </div>
        ) : null}

        {estado === "exito" ? (
          <div className="border-teal/30 bg-teal-soft flex items-start gap-2 rounded-[var(--radius-sm)] border p-3">
            <CircleCheckAnimado className="text-teal mt-0.5 size-4 shrink-0" />
            <p className="text-navy text-sm">Contraseña actualizada.</p>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          loading={estado === "enviando"}
          disabled={password === "" || confirmacion === ""}
        >
          {estado === "enviando" ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
