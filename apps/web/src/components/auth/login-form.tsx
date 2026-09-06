"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, INPUT_CLASSES } from "@/components/ui/field";
import { TriangleAlertAnimado } from "@/components/ui/icons/triangle-alert-animado";
import { crearClienteBrowser } from "@/lib/supabase/client";

interface LoginFormProps {
  /** A dónde volver después de un login exitoso -- la ruta que el
   * middleware guardó en `?next=` al rechazar el acceso sin sesión. */
  siguiente: string;
}

type Estado = "idle" | "enviando" | "error";

/** Espejo en español de los mensajes fijos que devuelve Supabase Auth para
 * email/contraseña -- lo demás (rate limit, etc.) se muestra tal cual. */
function mensajeLegible(mensaje: string): string {
  if (mensaje === "Invalid login credentials") {
    return "Email o contraseña incorrectos.";
  }
  return mensaje;
}

/**
 * Login con email + contraseña (issue #52) -- reemplaza el magic link
 * original: el plan free de Supabase manda como máximo 2 correos por HORA
 * compartidos entre todo el equipo (`rate_limit_email_sent`), así que un
 * login por link se volvía inusable con más de un par de personas
 * entrando el mismo rato. Con contraseña, iniciar sesión no manda ningún
 * correo -- solo hace falta uno (fuera de esta pantalla, vía el Admin API
 * de Supabase) para crear cada cuenta la primera vez.
 *
 * No hay pantalla de registro acá a propósito: las cuentas las da de alta
 * el propio Deivs (`restringir_dominio_signup`, #23, sigue validando el
 * dominio igual del lado de la base) -- ver `scripts/crear_usuario_auth.py`
 * en `packages/laser_toolkit`.
 */
export function LoginForm({ siguiente }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEstado("enviando");

    const supabase = crearClienteBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setEstado("error");
      setMensajeError(mensajeLegible(error.message));
      return;
    }

    router.push(siguiente);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Field label="Email de trabajo">
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

        <Field label="Contraseña">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          disabled={email.trim() === "" || password === ""}
        >
          {estado === "enviando" ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
