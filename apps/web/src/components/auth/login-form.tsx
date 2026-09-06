"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { CircleCheckAnimado } from "@/components/ui/icons/circle-check-animado";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { crearClienteBrowser } from "@/lib/supabase/client";

interface LoginFormProps {
  /** A dónde volver después de un login exitoso -- la ruta que el
   * middleware guardó en `?next=` al rechazar el acceso sin sesión. */
  siguiente: string;
}

type Estado = "idle" | "enviando" | "enviado" | "error";

const DOMINIO_PERMITIDO = "fluxsolutionscali.com";
const MENSAJE_DOMINIO_RECHAZADO = `Solo se permiten cuentas @${DOMINIO_PERMITIDO}.`;

/**
 * Login sin contraseña (magic link, issue #52): un solo campo de email.
 * `restringir_dominio_signup` (trigger de Postgres, #23) rechaza cualquier
 * dominio que no sea @fluxsolutionscali.com directo en Postgres -- pero el
 * cliente JS usa el flujo PKCE (`code_challenge`), y con ese flujo GoTrue
 * envuelve la excepción real en un "Database error saving new user"
 * genérico en vez de propagar el mensaje del trigger (confirmado
 * comparando la respuesta real del SDK contra un POST crudo a
 * `/auth/v1/otp`, que sí trae el texto del trigger tal cual). Por eso acá
 * se reinterpreta ese caso puntual en vez de mostrar `error.message` tal
 * cual -- lo demás (rate limit, etc.) sí se muestra directo.
 */
export function LoginForm({ siguiente }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEstado("enviando");

    const supabase = crearClienteBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(siguiente)}`,
      },
    });

    if (error) {
      setEstado("error");
      setMensajeError(
        error.message.includes("Database error saving new user")
          ? MENSAJE_DOMINIO_RECHAZADO
          : error.message,
      );
    } else {
      setEstado("enviado");
    }
  }

  if (estado === "enviado") {
    return (
      <Card accent="teal" className="flex flex-col items-start gap-4 p-6">
        <span
          className="bg-teal-soft text-teal flex size-12 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <CircleCheckAnimado className="size-6" strokeWidth={1.75} />
        </span>
        <div aria-live="polite">
          <p className="text-navy text-base font-semibold">
            Te enviamos un link a {email.trim()}
          </p>
          <p className="text-text-muted mt-1 text-sm">
            Abrilo desde este mismo dispositivo para entrar — el link vence a
            los pocos minutos.
          </p>
        </div>
        <Button variant="outline" onClick={() => setEstado("idle")}>
          Usar otro email
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Field
          label="Email de trabajo"
          hint="Solo cuentas @fluxsolutionscali.com"
        >
          {(id) => (
            <div className="relative">
              <Mail
                className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                strokeWidth={1.75}
              />
              <input
                id={id}
                type="email"
                required
                autoComplete="email"
                placeholder="nombre@fluxsolutionscali.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

        <Button
          type="submit"
          variant="primary"
          loading={estado === "enviando"}
          disabled={email.trim() === ""}
        >
          {estado === "enviando" ? "Enviando…" : "Enviar link mágico"}
        </Button>
      </form>
    </Card>
  );
}
